import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { generateText } from "ai";
import { gpt4o, gpt4oMini } from "@/lib/ai/providers/openai";
import {
  buildContentGenerationPrompt,
  buildWeeklyPlanningPrompt,
} from "@/lib/ai/prompts/system";
import { assembleContext } from "@/lib/rag/context";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { insertContent, getContentForDateRange } from "@/lib/db/content";
import { checkUsageLimit, recordUsage } from "@/lib/usage/tracker";
import { db } from "@/lib/db/client";
import { brandProfiles, campaigns, ideas } from "@/lib/db/schema";
import { getOrgCadence, formatCadenceForPrompt } from "@/lib/cadence/defaults";
import type { Platform } from "@/lib/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface PlannedSlot {
  slotIndex: number;
  platform: Platform;
  dayOfWeek: number;
  timeSlot: string;
  topic: string;
  pillar: string;
  brief: string;
  campaignTie: string | null;
  ideaSource: string | null;
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  if (!user.isApiKeyUser) {
    const usage = await checkUsageLimit(user.id, user.usageLimitCents);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Usage limit reached. You've spent $${(usage.spentCents / 100).toFixed(2)} of your $${(usage.limitCents / 100).toFixed(2)} limit.`,
        },
        { status: 429 }
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const { campaignId, preview, targetWeek } = body as {
    campaignId?: string;
    preview?: boolean;
    targetWeek?: "current" | "next";
  };

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  // ── Gather everything the app knows ────────────────────────────────

  // 1. Brand profile
  const [brand] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.orgId, org.id))
    .limit(1);

  if (!brand) {
    return NextResponse.json(
      {
        error: `No brand profile found for org "${org.slug}". Create a brand profile first.`,
      },
      { status: 400 }
    );
  }

  // 2. Posting cadence (from DB or defaults)
  const cadence = await getOrgCadence(org.id);

  // ── Smart week targeting ──────────────────────────────────────────
  // If >50% of the current week has passed (Thu+), default to next week
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const daysIntoCurrent = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Mon=0
  const useNextWeek =
    targetWeek === "next" || (!targetWeek && daysIntoCurrent >= 4); // Thu=4

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysIntoCurrent + (useNextWeek ? 7 : 0));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekLabel = `${monday.toISOString().split("T")[0]} to ${sunday.toISOString().split("T")[0]}`;

  // ── Collision detection ──────────────────────────────────────────
  const existingContent = await getContentForDateRange(org.id, monday, sunday);

  // Build a set of occupied slots: "YYYY-MM-DD|platform|HH:MM"
  const occupiedSlots = new Set<string>();
  for (const item of existingContent) {
    if (item.scheduledDate) {
      const key = `${item.scheduledDate}|${item.platform}|${item.scheduledTime || ""}`;
      occupiedSlots.add(key);
    }
  }

  // Filter cadence to only empty slots
  const availableSlots = cadence.filter((slot) => {
    const dayOfWeek = slot.dayOfWeek;
    const slotDate = new Date(monday);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    slotDate.setDate(monday.getDate() + daysFromMonday);
    const dateStr = slotDate.toISOString().split("T")[0];
    const key = `${dateStr}|${slot.platform}|${slot.timeSlot}`;
    return !occupiedSlots.has(key);
  });

  if (availableSlots.length === 0) {
    return NextResponse.json({
      success: true,
      count: 0,
      items: [],
      week: weekLabel,
      skipped: cadence.length,
      message: `All ${cadence.length} slots for the week of ${weekLabel} already have content. Nothing to generate.`,
    });
  }

  // 3. Full context assembly (brand, RAG, learnings, preferences, current state)
  const context = await assembleContext(org.id, "weekly content plan");

  // 4. Active campaigns
  const activeCampaigns = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      objective: campaigns.objective,
      platforms: campaigns.platforms,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
    })
    .from(campaigns)
    .where(and(eq(campaigns.orgId, org.id), eq(campaigns.status, "active")));

  const campaignContext = activeCampaigns.length > 0
    ? activeCampaigns
        .map((c) => {
          const platforms = (c.platforms as string[])?.join(", ") || "all";
          const end = c.endDate
            ? new Date(c.endDate).toISOString().split("T")[0]
            : "ongoing";
          const daysLeft = c.endDate
            ? Math.ceil(
                (new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            : null;
          const urgency = daysLeft !== null && daysLeft <= 7
            ? ` ⚠ ENDING SOON (${daysLeft} days left)`
            : "";
          return `- "${c.name}" | objective: ${c.objective || "none"} | platforms: ${platforms} | ends: ${end}${urgency}`;
        })
        .join("\n")
    : "";

  // 5. Captured ideas
  const capturedIdeas = await db
    .select({ id: ideas.id, text: ideas.text, platform: ideas.platform, pillar: ideas.pillar })
    .from(ideas)
    .where(and(eq(ideas.orgId, org.id), eq(ideas.status, "captured")))
    .orderBy(desc(ideas.createdAt))
    .limit(15);

  const ideasContext = capturedIdeas.length > 0
    ? capturedIdeas
        .map((idea) => {
          let line = `- "${idea.text}"`;
          if (idea.platform) line += ` [${idea.platform}]`;
          if (idea.pillar) line += ` [pillar: ${idea.pillar}]`;
          return line;
        })
        .join("\n")
    : "";

  // ── Phase 1: AI Plans the Week ─────────────────────────────────────

  const skippedCount = cadence.length - availableSlots.length;

  const planningPrompt = buildWeeklyPlanningPrompt({
    cadence: formatCadenceForPrompt(availableSlots),
    brandContext: context.brandContext,
    ragContext: context.ragContext,
    learnings: context.learnings,
    preferences: context.preferences,
    currentState: context.currentState,
    activeCampaigns: campaignContext,
    capturedIdeas: ideasContext,
    slotCount: availableSlots.length,
  });

  const { text: planText, usage: planUsage } = await generateText({
    model: gpt4o,
    prompt: planningPrompt,
  });

  if (!user.isApiKeyUser && planUsage) {
    await recordUsage({
      userId: user.id,
      orgId: org.id,
      model: "gpt-4o",
      route: "/api/content/bulk",
      inputTokens: planUsage.inputTokens ?? 0,
      outputTokens: planUsage.outputTokens ?? 0,
    });
  }

  // Parse the plan
  let plan: PlannedSlot[];
  try {
    const cleaned = planText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    plan = JSON.parse(cleaned);
  } catch {
    // Fallback: generate a basic plan from available slots only
    plan = availableSlots.map((slot, i) => ({
      slotIndex: i,
      platform: slot.platform,
      dayOfWeek: slot.dayOfWeek,
      timeSlot: slot.timeSlot,
      topic: `${brand.name} — ${slot.contentPillar || "General"} content`,
      pillar: slot.contentPillar || "General",
      brief: "Create engaging, on-brand content for this slot.",
      campaignTie: null,
      ideaSource: null,
    }));
  }

  // ── Preview mode: return the plan without generating content ───────

  if (preview) {
    return NextResponse.json({
      success: true,
      preview: true,
      week: weekLabel,
      plan: plan.map((p, i) => {
        const slot = availableSlots[i] || availableSlots[0];
        const dayOfWeek = p.dayOfWeek ?? slot.dayOfWeek;
        const slotDate = new Date(monday);
        const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        slotDate.setDate(monday.getDate() + daysFromMon);
        return {
          ...p,
          date: slotDate.toISOString().split("T")[0],
          dayName: DAY_NAMES[dayOfWeek],
        };
      }),
      totalSlots: cadence.length,
      availableSlots: availableSlots.length,
      skippedSlots: skippedCount,
      existingContent: existingContent.length,
    });
  }

  // ── Phase 2: Generate Each Piece with Full Context ─────────────────

  const results = await Promise.all(
    plan.map(async (planned, i) => {
      const slot = availableSlots[i] || availableSlots[0];
      const platform = (planned.platform || slot.platform) as Platform;

      const prompt = buildContentGenerationPrompt(
        platform,
        planned.topic,
        planned.pillar,
        context.brandContext,
        context.ragContext,
        {
          learnings: context.learnings,
          preferences: context.preferences,
          currentState: context.currentState,
          weeklyPlanBrief: planned.brief
            + (planned.campaignTie ? `\nThis post supports the "${planned.campaignTie}" campaign.` : ""),
        }
      );

      const { text, usage } = await generateText({
        model: gpt4oMini,
        prompt,
      });

      if (!user.isApiKeyUser && usage) {
        await recordUsage({
          userId: user.id,
          orgId: org.id,
          model: "gpt-4o-mini",
          route: "/api/content/bulk",
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
        });
      }

      let parsed: {
        hook: string;
        body: string;
        cta: string;
        hashtags: string[];
        pillar: string;
      };
      try {
        const cleaned = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          hook: "",
          body: text,
          cta: "",
          hashtags: [],
          pillar: planned.pillar,
        };
      }

      // Calculate the actual date for this slot
      const dayOfWeek = planned.dayOfWeek ?? slot.dayOfWeek;
      const timeSlot = planned.timeSlot ?? slot.timeSlot;
      const slotDate = new Date(monday);
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      slotDate.setDate(monday.getDate() + daysFromMonday);
      const dateStr = slotDate.toISOString().split("T")[0];

      // Resolve campaign ID — if the plan ties to a campaign, find its ID
      let resolvedCampaignId = campaignId;
      if (!resolvedCampaignId && planned.campaignTie) {
        const match = activeCampaigns.find(
          (c) => c.name.toLowerCase() === planned.campaignTie!.toLowerCase()
        );
        if (match) resolvedCampaignId = match.id;
      }

      const item = await insertContent(org.id, {
        platform,
        hook: parsed.hook,
        body: parsed.body,
        cta: parsed.cta,
        hashtags: parsed.hashtags,
        pillar: parsed.pillar || planned.pillar,
        topic: planned.topic,
        scheduledDate: dateStr,
        scheduledTime: timeSlot,
        campaignId: resolvedCampaignId,
      });

      return {
        ...item,
        dayName: DAY_NAMES[dayOfWeek],
      };
    })
  );

  // ── Mark used ideas ────────────────────────────────────────────────

  const usedIdeaTexts = plan
    .map((p) => p.ideaSource)
    .filter((t): t is string => t !== null && t !== undefined);

  if (usedIdeaTexts.length > 0) {
    // Best-effort: mark matching ideas as "used"
    for (const ideaText of usedIdeaTexts) {
      const match = capturedIdeas.find(
        (idea) => idea.text.toLowerCase() === ideaText.toLowerCase()
      );
      if (match) {
        await db
          .update(ideas)
          .set({ status: "used", updatedAt: new Date() })
          .where(eq(ideas.id, match.id));
      }
    }
  }

  return NextResponse.json({
    success: true,
    count: results.length,
    items: results,
    week: weekLabel,
    skipped: skippedCount,
  });
}
