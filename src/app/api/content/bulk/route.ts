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
import { insertContent } from "@/lib/db/content";
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
  const memoryUserId = user.isApiKeyUser ? undefined : user.id;

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
  const { campaignId } = body as { campaignId?: string };

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

  // 3. Full context assembly (brand, RAG, learnings, preferences, current state)
  const context = await assembleContext(org.id, "weekly content plan", memoryUserId);

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

  const planningPrompt = buildWeeklyPlanningPrompt({
    cadence: formatCadenceForPrompt(cadence),
    brandContext: context.brandContext,
    ragContext: context.ragContext,
    learnings: context.learnings,
    preferences: context.preferences,
    currentState: context.currentState,
    activeCampaigns: campaignContext,
    capturedIdeas: ideasContext,
    slotCount: cadence.length,
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
    // Fallback: generate a basic plan from cadence slots
    plan = cadence.map((slot, i) => ({
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

  // ── Phase 2: Generate Each Piece with Full Context ─────────────────

  // Get the Monday of the current week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const results = await Promise.all(
    plan.map(async (planned, i) => {
      const slot = cadence[i] || cadence[0];
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
  });
}
