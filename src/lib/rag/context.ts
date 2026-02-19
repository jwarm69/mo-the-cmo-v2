/**
 * Context assembly for prompts.
 */

import { and, desc, eq, gte, sql, count } from "drizzle-orm";
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
  const [recentContent, activeCampaigns, pillarCounts] = await Promise.all([
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
