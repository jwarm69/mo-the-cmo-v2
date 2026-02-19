import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { gpt4oMini } from "@/lib/ai/providers/openai";
import { buildContentGenerationPrompt } from "@/lib/ai/prompts/system";
import { assembleContext } from "@/lib/rag/context";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { insertContent } from "@/lib/db/content";
import { checkUsageLimit, recordUsage } from "@/lib/usage/tracker";
import { db } from "@/lib/db/client";
import { brandProfiles } from "@/lib/db/schema";
import type { Platform } from "@/lib/types";

const WEEKLY_SCHEDULE: { day: number; time: string; platform: Platform }[] = [
  { day: 1, time: "12:00", platform: "tiktok" },
  { day: 1, time: "18:00", platform: "instagram" },
  { day: 2, time: "12:00", platform: "tiktok" },
  { day: 2, time: "17:00", platform: "twitter" },
  { day: 3, time: "12:00", platform: "tiktok" },
  { day: 3, time: "18:00", platform: "instagram" },
  { day: 4, time: "12:00", platform: "tiktok" },
  { day: 4, time: "17:00", platform: "twitter" },
  { day: 5, time: "12:00", platform: "tiktok" },
  { day: 5, time: "18:00", platform: "instagram" },
  { day: 6, time: "11:00", platform: "tiktok" },
  { day: 6, time: "15:00", platform: "instagram" },
  { day: 0, time: "14:00", platform: "tiktok" },
  { day: 0, time: "18:00", platform: "instagram" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pickWeightedPillar(
  pillars: { name: string; ratio: number }[]
): string {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const p of pillars) {
    cumulative += p.ratio;
    if (rand <= cumulative) {
      return p.name;
    }
  }
  return pillars[0]?.name ?? "General";
}

function generateTopicsFromProfile(brand: {
  contentPillars?: { name: string; description: string }[] | null;
  targetAudience?: { painPoints?: string[]; goals?: string[] } | null;
  name: string;
}): string[] {
  const topics: string[] = [];

  // Derive topics from content pillar descriptions
  if (brand.contentPillars) {
    for (const pillar of brand.contentPillars) {
      topics.push(`${pillar.name}: ${pillar.description.split(".")[0]}`);
    }
  }

  // Derive topics from pain points
  if (brand.targetAudience?.painPoints) {
    for (const pain of brand.targetAudience.painPoints.slice(0, 5)) {
      const short = pain.split("—")[0]?.trim() ?? pain;
      topics.push(`How ${brand.name} solves: ${short}`);
    }
  }

  // Derive topics from goals
  if (brand.targetAudience?.goals) {
    for (const goal of brand.targetAudience.goals.slice(0, 4)) {
      const short = goal.split("—")[0]?.trim() ?? goal;
      topics.push(short);
    }
  }

  return topics.length > 0 ? topics : [`What makes ${brand.name} different`];
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
  const { campaignId, topics: requestTopics } = body as {
    campaignId?: string;
    topics?: string[];
  };

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  // Fetch org's brand profile from DB
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

  const pillars = brand.contentPillars ?? [
    { name: "General", ratio: 100, description: "General content" },
  ];
  const topics =
    requestTopics && requestTopics.length > 0
      ? requestTopics
      : generateTopicsFromProfile(brand);

  const { brandContext } = await assembleContext(org.id, "weekly content plan");

  // Get the Monday of the current week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const results = await Promise.all(
    WEEKLY_SCHEDULE.map(async (slot, i) => {
      const topic = topics[i % topics.length];
      const pillar = pickWeightedPillar(pillars);

      const prompt = buildContentGenerationPrompt(
        slot.platform,
        topic,
        pillar,
        brandContext
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
        parsed = { hook: "", body: text, cta: "", hashtags: [], pillar };
      }

      // Calculate the actual date for this slot
      const slotDate = new Date(monday);
      const daysFromMonday = slot.day === 0 ? 6 : slot.day - 1;
      slotDate.setDate(monday.getDate() + daysFromMonday);
      const dateStr = slotDate.toISOString().split("T")[0];

      const item = await insertContent(org.id, {
        platform: slot.platform,
        hook: parsed.hook,
        body: parsed.body,
        cta: parsed.cta,
        hashtags: parsed.hashtags,
        pillar: parsed.pillar || pillar,
        topic,
        scheduledDate: dateStr,
        scheduledTime: slot.time,
        campaignId,
      });

      return {
        ...item,
        dayName: DAY_NAMES[slot.day],
      };
    })
  );

  return NextResponse.json({
    success: true,
    count: results.length,
    items: results,
  });
}
