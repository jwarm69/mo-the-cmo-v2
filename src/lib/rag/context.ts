/**
 * Context assembly for prompts.
 */

import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  agentLearnings,
  agentPreferences,
  brandProfiles,
  calendarSlots,
  campaigns,
  contentItems,
  ideas,
  knowledgeDocuments,
  organizations,
} from "@/lib/db/schema";
import { getRelevantLearnings } from "@/lib/memory/long-term";
import { searchKnowledge } from "./search";
import { normalizeBrandProfile } from "@/lib/brand/defaults";

const CONTEXT_CACHE_TTL_MS = 60_000;
const CONTEXT_CACHE_MAX_ENTRIES = 200;

export interface AssembledContext {
  brandContext: string;
  ragContext: string;
  learnings: string;
  preferences: string;
  currentState: string;
}

interface ContextFreshnessVector {
  brandUpdatedAt: string;
  knowledgeUpdatedAt: string;
  preferencesUpdatedAt: string;
  learningsUpdatedAt: string;
  contentUpdatedAt: string;
  campaignsUpdatedAt: string;
  cadenceUpdatedAt: string;
  ideasUpdatedAt: string;
}

interface ContextCacheEntry {
  value: AssembledContext;
  freshnessKey: string;
  expiresAt: number;
}

const contextCache = new Map<string, ContextCacheEntry>();

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

function normalizeQuery(query: string): string {
  const normalized = query.trim().toLowerCase();
  return normalized || "__empty__";
}

function toDateKey(value: Date | string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "n/a";
  return new Date(value).toISOString().split("T")[0];
}

function buildCacheKey(orgId: string, query: string, userId?: string): string {
  return `${orgId}:${userId || "shared"}:${query}`;
}

function buildFreshnessKey(vector: ContextFreshnessVector): string {
  return JSON.stringify(vector);
}

function setContextCache(key: string, entry: ContextCacheEntry): void {
  contextCache.set(key, entry);
  while (contextCache.size > CONTEXT_CACHE_MAX_ENTRIES) {
    const oldestKey = contextCache.keys().next().value;
    if (!oldestKey) break;
    contextCache.delete(oldestKey);
  }
}

function learningVisibilityFilter(userId?: string) {
  return userId
    ? sql`(${agentLearnings.userId} IS NULL OR ${agentLearnings.userId} = ${userId})`
    : sql`${agentLearnings.userId} IS NULL`;
}

async function getContextFreshness(
  orgId: string,
  userId?: string
): Promise<ContextFreshnessVector> {
  const learningFilter = learningVisibilityFilter(userId);

  const [
    brandHead,
    knowledgeHead,
    preferenceHead,
    learningsHead,
    contentHead,
    campaignsHead,
    cadenceHead,
    ideasHead,
  ] = await Promise.all([
    db
      .select({ updatedAt: brandProfiles.updatedAt })
      .from(brandProfiles)
      .where(eq(brandProfiles.orgId, orgId))
      .orderBy(desc(brandProfiles.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: knowledgeDocuments.updatedAt })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.orgId, orgId))
      .orderBy(desc(knowledgeDocuments.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: agentPreferences.updatedAt })
      .from(agentPreferences)
      .where(
        and(eq(agentPreferences.orgId, orgId), eq(agentPreferences.isActive, true))
      )
      .orderBy(desc(agentPreferences.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: agentLearnings.updatedAt })
      .from(agentLearnings)
      .where(and(eq(agentLearnings.orgId, orgId), learningFilter))
      .orderBy(desc(agentLearnings.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: contentItems.updatedAt })
      .from(contentItems)
      .where(eq(contentItems.orgId, orgId))
      .orderBy(desc(contentItems.updatedAt))
      .limit(1),
    db
      .select({ updatedAt: campaigns.updatedAt })
      .from(campaigns)
      .where(eq(campaigns.orgId, orgId))
      .orderBy(desc(campaigns.updatedAt))
      .limit(1),
    db
      .select({ createdAt: calendarSlots.createdAt })
      .from(calendarSlots)
      .where(and(eq(calendarSlots.orgId, orgId), eq(calendarSlots.isActive, true)))
      .orderBy(desc(calendarSlots.createdAt))
      .limit(1),
    db
      .select({ updatedAt: ideas.updatedAt })
      .from(ideas)
      .where(eq(ideas.orgId, orgId))
      .orderBy(desc(ideas.updatedAt))
      .limit(1),
  ]);

  return {
    brandUpdatedAt: toDateKey(brandHead[0]?.updatedAt),
    knowledgeUpdatedAt: toDateKey(knowledgeHead[0]?.updatedAt),
    preferencesUpdatedAt: toDateKey(preferenceHead[0]?.updatedAt),
    learningsUpdatedAt: toDateKey(learningsHead[0]?.updatedAt),
    contentUpdatedAt: toDateKey(contentHead[0]?.updatedAt),
    campaignsUpdatedAt: toDateKey(campaignsHead[0]?.updatedAt),
    cadenceUpdatedAt: toDateKey(cadenceHead[0]?.createdAt),
    ideasUpdatedAt: toDateKey(ideasHead[0]?.updatedAt),
  };
}

function formatFreshnessVector(vector: ContextFreshnessVector): string {
  const pairs = Object.entries(vector).map(
    ([key, value]) => `${key}=${value || "none"}`
  );
  return pairs.join(" | ");
}

async function buildStateDigest(
  orgId: string,
  brand: ReturnType<typeof normalizeBrandProfile>
): Promise<string> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const pillarExpr = sql<string>`COALESCE(${contentItems.metadata}->>'pillar', 'General')`;

  const [
    recentContent,
    activeCampaigns,
    upcomingScheduled,
    statusCounts,
    platformCounts,
    pillarCounts,
    cadence,
    capturedIdeas,
    ideaCounts,
    knowledgeSummaryRows,
  ] = await Promise.all([
    db
      .select({
        platform: contentItems.platform,
        status: contentItems.status,
        title: contentItems.title,
        metadata: contentItems.metadata,
        scheduledAt: contentItems.scheduledAt,
        publishedAt: contentItems.publishedAt,
        createdAt: contentItems.createdAt,
      })
      .from(contentItems)
      .where(eq(contentItems.orgId, orgId))
      .orderBy(desc(contentItems.createdAt))
      .limit(10),
    db
      .select({
        name: campaigns.name,
        objective: campaigns.objective,
        platforms: campaigns.platforms,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
      })
      .from(campaigns)
      .where(and(eq(campaigns.orgId, orgId), eq(campaigns.status, "active")))
      .orderBy(desc(campaigns.updatedAt))
      .limit(8),
    db
      .select({
        platform: contentItems.platform,
        title: contentItems.title,
        scheduledAt: contentItems.scheduledAt,
      })
      .from(contentItems)
      .where(
        and(eq(contentItems.orgId, orgId), gte(contentItems.scheduledAt, now))
      )
      .orderBy(asc(contentItems.scheduledAt))
      .limit(8),
    db
      .select({
        status: contentItems.status,
        count: sql<number>`count(*)::int`,
      })
      .from(contentItems)
      .where(eq(contentItems.orgId, orgId))
      .groupBy(contentItems.status),
    db
      .select({
        platform: contentItems.platform,
        count: sql<number>`count(*)::int`,
      })
      .from(contentItems)
      .where(eq(contentItems.orgId, orgId))
      .groupBy(contentItems.platform),
    db
      .select({
        pillar: pillarExpr,
        count: sql<number>`count(*)::int`,
      })
      .from(contentItems)
      .where(and(eq(contentItems.orgId, orgId), gte(contentItems.createdAt, startOfMonth)))
      .groupBy(pillarExpr)
      .orderBy(desc(sql<number>`count(*)::int`)),
    db
      .select({
        dayOfWeek: calendarSlots.dayOfWeek,
        timeSlot: calendarSlots.timeSlot,
        platform: calendarSlots.platform,
        contentPillar: calendarSlots.contentPillar,
      })
      .from(calendarSlots)
      .where(and(eq(calendarSlots.orgId, orgId), eq(calendarSlots.isActive, true)))
      .orderBy(asc(calendarSlots.dayOfWeek), asc(calendarSlots.timeSlot)),
    db
      .select({
        text: ideas.text,
        platform: ideas.platform,
        pillar: ideas.pillar,
      })
      .from(ideas)
      .where(and(eq(ideas.orgId, orgId), eq(ideas.status, "captured")))
      .orderBy(desc(ideas.updatedAt))
      .limit(5),
    db
      .select({
        status: ideas.status,
        count: sql<number>`count(*)::int`,
      })
      .from(ideas)
      .where(eq(ideas.orgId, orgId))
      .groupBy(ideas.status),
    db
      .select({
        count: sql<number>`count(*)::int`,
        lastUpdatedAt: sql<string | null>`max(${knowledgeDocuments.updatedAt})`,
      })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.orgId, orgId)),
  ]);

  const lines: string[] = [];
  lines.push(`State Digest Generated At (UTC): ${now.toISOString()}`);

  if (statusCounts.length > 0) {
    const statusSummary = statusCounts
      .map((row) => `${row.status}=${Number(row.count)}`)
      .join(", ");
    lines.push(`\nContent Pipeline Status Counts: ${statusSummary}`);
  } else {
    lines.push("\nContent Pipeline Status Counts: no content yet.");
  }

  if (platformCounts.length > 0) {
    const platformSummary = platformCounts
      .map((row) => `${row.platform}=${Number(row.count)}`)
      .join(", ");
    lines.push(`Content Volume By Platform: ${platformSummary}`);
  }

  if (upcomingScheduled.length > 0) {
    lines.push("\nUpcoming Scheduled Content:");
    for (const item of upcomingScheduled) {
      lines.push(
        `- [${item.platform}] ${item.title || "(untitled)"} at ${formatDate(item.scheduledAt)}`
      );
    }
  }

  if (recentContent.length > 0) {
    lines.push("\nRecent Content:");
    for (const item of recentContent) {
      const meta = (item.metadata ?? {}) as Record<string, unknown>;
      const pillar = typeof meta.pillar === "string" ? meta.pillar : "General";
      const scheduled = item.scheduledAt
        ? ` | scheduled=${formatDate(item.scheduledAt)}`
        : "";
      const published = item.publishedAt
        ? ` | published=${formatDate(item.publishedAt)}`
        : "";
      lines.push(
        `- [${item.platform}] ${item.title || "(untitled)"} | status=${item.status} | pillar=${pillar}${scheduled}${published}`
      );
    }
  }

  if (activeCampaigns.length > 0) {
    lines.push("\nActive Campaigns:");
    for (const campaign of activeCampaigns) {
      const platformList = (campaign.platforms as string[] | null)?.join(", ") || "all";
      const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
      const daysLeft = endDate
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const urgency =
        daysLeft !== null && daysLeft <= 7 ? ` | urgency=${Math.max(daysLeft, 0)}d` : "";
      lines.push(
        `- "${campaign.name}" | objective=${campaign.objective || "none"} | platforms=${platformList} | ${formatDate(campaign.startDate)} to ${formatDate(campaign.endDate)}${urgency}`
      );
    }
  }

  if (cadence.length > 0) {
    lines.push("\nActive Cadence Slots:");
    for (const slot of cadence.slice(0, 12)) {
      lines.push(
        `- day=${slot.dayOfWeek} time=${slot.timeSlot} platform=${slot.platform} pillar=${slot.contentPillar || "General"}`
      );
    }
  }

  if (ideaCounts.length > 0) {
    const ideaSummary = ideaCounts
      .map((row) => `${row.status}=${Number(row.count)}`)
      .join(", ");
    lines.push(`\nIdeas Backlog Counts: ${ideaSummary}`);
  }

  if (capturedIdeas.length > 0) {
    lines.push("Recent Captured Ideas:");
    for (const idea of capturedIdeas) {
      let line = `- "${idea.text}"`;
      if (idea.platform) line += ` [${idea.platform}]`;
      if (idea.pillar) line += ` [pillar=${idea.pillar}]`;
      lines.push(line);
    }
  }

  const knowledgeSummary = knowledgeSummaryRows[0];
  lines.push(
    `\nKnowledge Base Coverage: docs=${Number(knowledgeSummary?.count || 0)}, lastUpdated=${formatDate(knowledgeSummary?.lastUpdatedAt)}`
  );

  if (pillarCounts.length > 0) {
    const total = pillarCounts.reduce((sum, row) => sum + Number(row.count), 0);
    lines.push("Content Pillar Distribution (this month):");
    for (const row of pillarCounts) {
      const count = Number(row.count);
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      lines.push(`- ${row.pillar}: ${count} pieces (${pct}%)`);
    }

    for (const target of brand.contentPillars) {
      const matched = pillarCounts.find((row) => row.pillar === target.name);
      const actual = matched ? Number(matched.count) : 0;
      const actualPct = total > 0 ? Math.round((actual / total) * 100) : 0;
      if (Math.abs(target.ratio - actualPct) > 10) {
        lines.push(
          `- WARNING pillar imbalance: ${target.name} target=${target.ratio}% actual=${actualPct}%`
        );
      }
    }
  }

  return lines.join("\n");
}

export async function assembleContext(
  orgId: string,
  query: string,
  userId?: string
): Promise<AssembledContext> {
  const normalizedQuery = normalizeQuery(query);
  const cacheKey = buildCacheKey(orgId, normalizedQuery, userId);
  const freshnessVector = await getContextFreshness(orgId, userId);
  const freshnessKey = buildFreshnessKey(freshnessVector);

  const cached = contextCache.get(cacheKey);
  if (
    cached &&
    cached.freshnessKey === freshnessKey &&
    cached.expiresAt > Date.now()
  ) {
    return cached.value;
  }

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

  const [knowledgeResults, learnings, preferenceRows, stateDigest] = await Promise.all([
    searchKnowledge(orgId, query, 5, org?.slug),
    getRelevantLearnings(orgId, query, 5, userId),
    db
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
      .limit(8),
    buildStateDigest(orgId, brand),
  ]);

  const assembled: AssembledContext = {
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
    currentState: [
      `Context Freshness (UTC): ${formatFreshnessVector(freshnessVector)}`,
      "",
      stateDigest,
    ].join("\n"),
  };

  setContextCache(cacheKey, {
    value: assembled,
    freshnessKey,
    expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS,
  });

  return assembled;
}

export function clearContextCache(): void {
  contextCache.clear();
}
