/**
 * Context assembly for prompts.
 */

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  agentPreferences,
  brandProfiles,
  campaigns,
  contentItems,
  organizations,
} from "@/lib/db/schema";
import { getRelevantLearnings } from "@/lib/memory/long-term";
import { searchKnowledge } from "./search";
import { normalizeBrandProfile } from "@/lib/brand/defaults";
import { getOrgCadence, formatCadenceForPrompt } from "@/lib/cadence/defaults";

function formatBrandContext(
  profile: ReturnType<typeof normalizeBrandProfile>
): string {
  return [
    `Brand Name: ${profile.name}`,
    `Voice: ${profile.voice}`,
    `Tone: ${profile.tone}`,
    `Messaging Pillars: ${profile.messagingPillars.join("; ")}`,
    `Content Pillars: ${profile.contentPillars
      .map((pillar) => `${pillar.name} (${pillar.ratio}%): ${pillar.description}`)
      .join(" | ")}`,
    `Target Demographics: ${profile.targetAudience.demographics}`,
    `Target Psychographics: ${profile.targetAudience.psychographics}`,
    `Pain Points: ${profile.targetAudience.painPoints.join("; ")}`,
    `Goals: ${profile.targetAudience.goals.join("; ")}`,
    `Guidelines: ${profile.brandGuidelines}`,
    `Competitors: ${profile.competitors.join(", ")}`,
    `Hashtags: ${profile.hashtags.join(" ")}`,
  ].join("\n");
}

export async function assembleContext(
  orgId: string,
  query: string
): Promise<{
  brandContext: string;
  ragContext: string;
  learnings: string;
  preferences: string;
  currentState: string;
}> {
  const [org] = await db
    .select({ slug: organizations.slug, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const [brandRecord] = await db
    .select({
      name: brandProfiles.name,
      voice: brandProfiles.voice,
      tone: brandProfiles.tone,
      messagingPillars: brandProfiles.messagingPillars,
      contentPillars: brandProfiles.contentPillars,
      targetAudience: brandProfiles.targetAudience,
      brandGuidelines: brandProfiles.brandGuidelines,
      competitors: brandProfiles.competitors,
      hashtags: brandProfiles.hashtags,
    })
    .from(brandProfiles)
    .where(eq(brandProfiles.orgId, orgId))
    .limit(1);

  const brand = normalizeBrandProfile({
    name: brandRecord?.name ?? org?.name,
    voice: brandRecord?.voice ?? undefined,
    tone: brandRecord?.tone ?? undefined,
    messagingPillars: brandRecord?.messagingPillars ?? undefined,
    contentPillars: brandRecord?.contentPillars ?? undefined,
    targetAudience: brandRecord?.targetAudience ?? undefined,
    brandGuidelines: brandRecord?.brandGuidelines ?? undefined,
    competitors: brandRecord?.competitors ?? undefined,
    hashtags: brandRecord?.hashtags ?? undefined,
  });

  const knowledgeResults = await searchKnowledge(orgId, query, 5, org?.slug);
  const learnings = await getRelevantLearnings(orgId, query, 5);
  const preferenceRows = await db
    .select({
      category: agentPreferences.category,
      preference: agentPreferences.preference,
      strength: agentPreferences.strength,
    })
    .from(agentPreferences)
    .where(
      and(eq(agentPreferences.orgId, orgId), eq(agentPreferences.isActive, true))
    )
    .orderBy(desc(agentPreferences.updatedAt))
    .limit(8);

  // Fetch current state for situational awareness
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Calculate this week's Monday and Sunday for schedule awareness
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysIntoCurrent = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysIntoCurrent);
  thisMonday.setHours(0, 0, 0, 0);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);

  const [recentContent, activeCampaigns, pillarCounts, thisWeekContent, cadence] = await Promise.all([
    // Last 10 content items
    db
      .select({
        platform: contentItems.platform,
        status: contentItems.status,
        title: contentItems.title,
        metadata: contentItems.metadata,
        scheduledAt: contentItems.scheduledAt,
        createdAt: contentItems.createdAt,
      })
      .from(contentItems)
      .where(eq(contentItems.orgId, orgId))
      .orderBy(desc(contentItems.createdAt))
      .limit(10),
    // Active campaigns
    db
      .select({
        name: campaigns.name,
        objective: campaigns.objective,
        platforms: campaigns.platforms,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
      })
      .from(campaigns)
      .where(and(eq(campaigns.orgId, orgId), eq(campaigns.status, "active"))),
    // Content pillar distribution this month
    db
      .select({ metadata: contentItems.metadata })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, orgId),
          gte(contentItems.createdAt, startOfMonth)
        )
      ),
    // This week's scheduled content
    db
      .select({
        platform: contentItems.platform,
        status: contentItems.status,
        title: contentItems.title,
        metadata: contentItems.metadata,
        scheduledAt: contentItems.scheduledAt,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, orgId),
          gte(contentItems.scheduledAt, thisMonday),
          lte(contentItems.scheduledAt, thisSunday)
        )
      )
      .orderBy(contentItems.scheduledAt),
    // Posting cadence
    getOrgCadence(orgId),
  ]);

  // Build current state string
  const stateLines: string[] = [];

  if (recentContent.length > 0) {
    stateLines.push("Recent Content:");
    for (const c of recentContent) {
      const meta = (c.metadata ?? {}) as Record<string, unknown>;
      const pillar = (meta.pillar as string) || "General";
      const scheduled = c.scheduledAt
        ? ` scheduled=${new Date(c.scheduledAt).toISOString().split("T")[0]}`
        : "";
      stateLines.push(
        `- [${c.platform}] ${c.title || "(untitled)"} | status=${c.status} | pillar=${pillar}${scheduled}`
      );
    }
  } else {
    stateLines.push("No content created yet.");
  }

  if (activeCampaigns.length > 0) {
    stateLines.push("\nActive Campaigns:");
    for (const camp of activeCampaigns) {
      const platforms = (camp.platforms as string[])?.join(", ") || "none";
      const dates = [
        camp.startDate ? new Date(camp.startDate).toISOString().split("T")[0] : "?",
        camp.endDate ? new Date(camp.endDate).toISOString().split("T")[0] : "ongoing",
      ].join(" to ");
      stateLines.push(
        `- "${camp.name}" | objective=${camp.objective || "none"} | platforms=${platforms} | ${dates}`
      );
    }
  }

  // Pillar balance this month
  if (pillarCounts.length > 0) {
    const pillarMap: Record<string, number> = {};
    for (const row of pillarCounts) {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const p = (meta.pillar as string) || "General";
      pillarMap[p] = (pillarMap[p] || 0) + 1;
    }
    const total = Object.values(pillarMap).reduce((a, b) => a + b, 0);
    stateLines.push("\nContent Pillar Distribution (this month):");
    for (const [name, cnt] of Object.entries(pillarMap)) {
      const pct = Math.round((cnt / total) * 100);
      stateLines.push(`- ${name}: ${cnt} pieces (${pct}%)`);
    }
    // Compare with targets
    const targetPillars = brand.contentPillars;
    for (const target of targetPillars) {
      const actual = pillarMap[target.name] || 0;
      const actualPct = total > 0 ? Math.round((actual / total) * 100) : 0;
      if (Math.abs(target.ratio - actualPct) > 10) {
        stateLines.push(
          `  ⚠ ${target.name}: target=${target.ratio}%, actual=${actualPct}%`
        );
      }
    }
  }

  // Posting cadence
  if (cadence.length > 0) {
    stateLines.push("\nPosting Cadence (weekly schedule):");
    stateLines.push(formatCadenceForPrompt(cadence));
  }

  // This week's scheduled content
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (thisWeekContent.length > 0) {
    stateLines.push(
      `\nThis Week's Schedule (${thisMonday.toISOString().split("T")[0]} to ${thisSunday.toISOString().split("T")[0]}):`
    );
    for (const c of thisWeekContent) {
      const meta = (c.metadata ?? {}) as Record<string, unknown>;
      const pillar = (meta.pillar as string) || "General";
      const topic = (meta.topic as string) || "";
      if (c.scheduledAt) {
        const d = new Date(c.scheduledAt);
        const dayName = DAY_NAMES[d.getDay()];
        const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
        stateLines.push(
          `- ${dayName} ${time} [${c.platform}] "${c.title || topic}" | pillar=${pillar} | status=${c.status}`
        );
      }
    }
  } else {
    stateLines.push("\nNo content scheduled for this week yet.");
  }

  const currentState = stateLines.join("\n");

  return {
    brandContext: formatBrandContext(brand),
    ragContext: knowledgeResults
      .map(
        (result, index) =>
          `(${index + 1}) [${result.documentTitle}] ${result.content}`
      )
      .join("\n\n"),
    learnings: learnings
      .map(
        (learning, index) =>
          `(${index + 1}) ${learning.category}: ${learning.insight} [confidence=${learning.confidence}, weight=${learning.weight}]`
      )
      .join("\n"),
    preferences: preferenceRows
      .map(
        (preference, index) =>
          `(${index + 1}) ${preference.category}: ${preference.preference} (strength=${preference.strength})`
      )
      .join("\n"),
    currentState,
  };
}
