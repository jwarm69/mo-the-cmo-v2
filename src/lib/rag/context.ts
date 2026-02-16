/**
 * Context assembly for prompts.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentPreferences, brandProfiles, organizations } from "@/lib/db/schema";
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
  };
}
