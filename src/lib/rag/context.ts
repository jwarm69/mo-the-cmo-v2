/**
 * Context assembly for prompts.
 */

import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
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
  products,
  marketingGoals,
  marketingPlans,
  tactics,
  gtmChannels,
  channelExperiments,
  customerProfiles,
  positioningFrameworks,
} from "@/lib/db/schema";
import { getRelevantLearnings } from "@/lib/memory/long-term";
import { searchKnowledge } from "./search";
import { normalizeBrandProfile } from "@/lib/brand/defaults";
import { searchBrain, formatBrainContext } from "@/lib/brain/context-brain";

const CONTEXT_CACHE_TTL_MS = 60_000;
const CONTEXT_CACHE_MAX_ENTRIES = 200;

export interface AssembledContext {
  brandContext: string;
  ragContext: string;
  learnings: string;
  preferences: string;
  currentState: string;
  productsContext: string;
  goalsContext: string;
  plansContext: string;
  brainContext: string;
  channelsContext: string;
  icpContext: string;
  positioningContext: string;
  campaignMissionsContext: string;
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

  const [
    knowledgeResults,
    learnings,
    preferenceRows,
    stateDigest,
    brainResults,
    productRows,
    goalRows,
    activePlanRows,
    channelRows,
    icpRows,
    positioningRows,
    campaignMissionRows,
  ] = await Promise.all([
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
    searchBrain(orgId, query, 8),
    db
      .select({
        name: products.name,
        description: products.description,
        status: products.status,
        uniqueValue: products.uniqueValue,
        outcomes: products.outcomes,
        pricing: products.pricing,
        launchDate: products.launchDate,
      })
      .from(products)
      .where(
        and(
          eq(products.orgId, orgId),
          inArray(products.status, ["active", "pre_launch", "developing"])
        )
      )
      .orderBy(desc(products.updatedAt))
      .limit(10),
    db
      .select({
        title: marketingGoals.title,
        timeframe: marketingGoals.timeframe,
        status: marketingGoals.status,
        targetMetric: marketingGoals.targetMetric,
        targetValue: marketingGoals.targetValue,
        currentValue: marketingGoals.currentValue,
        endDate: marketingGoals.endDate,
      })
      .from(marketingGoals)
      .where(
        and(
          eq(marketingGoals.orgId, orgId),
          inArray(marketingGoals.status, [
            "not_started",
            "in_progress",
            "on_track",
            "at_risk",
          ])
        )
      )
      .orderBy(desc(marketingGoals.updatedAt))
      .limit(10),
    db
      .select({
        title: marketingPlans.title,
        type: marketingPlans.type,
        status: marketingPlans.status,
        theme: marketingPlans.theme,
        keyMessages: marketingPlans.keyMessages,
        startDate: marketingPlans.startDate,
        endDate: marketingPlans.endDate,
      })
      .from(marketingPlans)
      .where(
        and(
          eq(marketingPlans.orgId, orgId),
          inArray(marketingPlans.status, ["draft", "active"])
        )
      )
      .orderBy(desc(marketingPlans.updatedAt))
      .limit(5),
    // Phase 1: Channels
    db
      .select({
        channel: gtmChannels.channel,
        channelCategory: gtmChannels.channelCategory,
        status: gtmChannels.status,
        priority: gtmChannels.priority,
        rationale: gtmChannels.rationale,
        notes: gtmChannels.notes,
      })
      .from(gtmChannels)
      .where(
        and(
          eq(gtmChannels.orgId, orgId),
          sql`${gtmChannels.status} != 'killed'`
        )
      )
      .orderBy(gtmChannels.priority)
      .limit(20),
    // Phase 2: ICPs
    db
      .select({
        name: customerProfiles.name,
        isPrimary: customerProfiles.isPrimary,
        status: customerProfiles.status,
        painPoints: customerProfiles.painPoints,
        goals: customerProfiles.goals,
        objections: customerProfiles.objections,
        preferredChannels: customerProfiles.preferredChannels,
        messagingAngle: customerProfiles.messagingAngle,
      })
      .from(customerProfiles)
      .where(
        and(
          eq(customerProfiles.orgId, orgId),
          sql`${customerProfiles.status} != 'retired'`
        )
      )
      .orderBy(desc(customerProfiles.isPrimary), customerProfiles.name)
      .limit(10),
    // Phase 2: Positioning
    db
      .select({
        type: positioningFrameworks.type,
        title: positioningFrameworks.title,
        content: positioningFrameworks.content,
        version: positioningFrameworks.version,
      })
      .from(positioningFrameworks)
      .where(
        and(
          eq(positioningFrameworks.orgId, orgId),
          eq(positioningFrameworks.isActive, true)
        )
      )
      .orderBy(desc(positioningFrameworks.updatedAt))
      .limit(10),
    // Phase 3: Campaign missions (active only, with milestones)
    db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        milestones: campaigns.milestones,
        completionPercent: campaigns.completionPercent,
        successCriteria: campaigns.successCriteria,
        endDate: campaigns.endDate,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.orgId, orgId),
          inArray(campaigns.status, ["active", "draft"])
        )
      )
      .orderBy(desc(campaigns.updatedAt))
      .limit(8),
  ]);

  // Format products context
  const productsContext = productRows.length > 0
    ? productRows
        .map((p, i) => {
          const parts = [`(${i + 1}) ${p.name} [${p.status}]`];
          if (p.description) parts.push(`Description: ${p.description}`);
          if (p.uniqueValue) parts.push(`Value: ${p.uniqueValue}`);
          if (p.outcomes?.length) parts.push(`Outcomes: ${(p.outcomes as string[]).join(", ")}`);
          if (p.pricing) {
            const pr = p.pricing as { amount: number; currency: string; model: string };
            parts.push(`Pricing: ${pr.amount} ${pr.currency} (${pr.model})`);
          }
          if (p.launchDate) parts.push(`Launch: ${formatDate(p.launchDate)}`);
          return parts.join(" | ");
        })
        .join("\n")
    : "";

  // Format goals context
  const goalsContext = goalRows.length > 0
    ? goalRows
        .map((g, i) => {
          const progress = g.targetValue
            ? ` | progress=${g.currentValue || 0}/${g.targetValue} ${g.targetMetric || ""}`
            : "";
          const deadline = g.endDate ? ` | deadline=${formatDate(g.endDate)}` : "";
          return `(${i + 1}) ${g.title} [${g.timeframe}, ${g.status}]${progress}${deadline}`;
        })
        .join("\n")
    : "";

  // Format plans context
  const plansContext = activePlanRows.length > 0
    ? activePlanRows
        .map((p, i) => {
          const messages = (p.keyMessages as string[] | null)?.join("; ") || "";
          return `(${i + 1}) ${p.title} [${p.type}, ${p.status}]${p.theme ? ` | theme="${p.theme}"` : ""}${messages ? ` | messages: ${messages}` : ""} | ${formatDate(p.startDate)} to ${formatDate(p.endDate)}`;
        })
        .join("\n")
    : "";

  // Format channels context (Phase 1)
  const channelsContext = channelRows.length > 0
    ? channelRows
        .map((ch, i) => {
          const parts = [`(${i + 1}) ${ch.channel} [${ch.channelCategory}] — ${ch.status} (priority ${ch.priority})`];
          if (ch.rationale) parts.push(`  Rationale: ${ch.rationale}`);
          if (ch.notes) parts.push(`  Notes: ${ch.notes}`);
          return parts.join("\n");
        })
        .join("\n")
    : "";

  // Format ICP context (Phase 2)
  const icpContext = icpRows.length > 0
    ? icpRows
        .map((p, i) => {
          const parts = [`(${i + 1}) ${p.name}${p.isPrimary ? " [PRIMARY]" : ""} [${p.status}]`];
          if (p.painPoints?.length) parts.push(`  Pain Points: ${(p.painPoints as string[]).join("; ")}`);
          if (p.goals?.length) parts.push(`  Goals: ${(p.goals as string[]).join("; ")}`);
          if (p.objections?.length) parts.push(`  Objections: ${(p.objections as string[]).join("; ")}`);
          if (p.preferredChannels?.length) parts.push(`  Channels: ${(p.preferredChannels as string[]).join(", ")}`);
          if (p.messagingAngle) parts.push(`  Angle: ${p.messagingAngle}`);
          return parts.join("\n");
        })
        .join("\n")
    : "";

  // Format positioning context (Phase 2)
  const positioningContext = positioningRows.length > 0
    ? positioningRows
        .map((f, i) => {
          const typeName = f.type.replace(/_/g, " ");
          const summary = typeof f.content === "object" && f.content !== null
            ? Object.entries(f.content as Record<string, unknown>)
                .slice(0, 3)
                .map(([k, v]) => `${k}: ${String(v).slice(0, 100)}`)
                .join(" | ")
            : "";
          return `(${i + 1}) [${typeName}] ${f.title} (v${f.version})${summary ? ` — ${summary}` : ""}`;
        })
        .join("\n")
    : "";

  // Format campaign missions context (Phase 3)
  const campaignMissionsContext = campaignMissionRows.length > 0
    ? campaignMissionRows
        .map((c, i) => {
          const milestones = (c.milestones ?? []) as Array<{
            title: string;
            dueDate: string;
            status: string;
          }>;
          const overdue = milestones.filter(
            (m) => m.status === "pending" && new Date(m.dueDate) < new Date()
          );
          const parts = [
            `(${i + 1}) "${c.name}" [${c.status}] — ${c.completionPercent ?? 0}% complete`,
          ];
          if (overdue.length > 0) {
            parts.push(`  OVERDUE: ${overdue.map((m) => `"${m.title}" (due ${m.dueDate})`).join(", ")}`);
          }
          if (milestones.length > 0) {
            const next = milestones.find((m) => m.status === "pending");
            if (next) parts.push(`  Next milestone: "${next.title}" (due ${next.dueDate})`);
          }
          if (c.successCriteria) parts.push(`  Success criteria: ${c.successCriteria}`);
          return parts.join("\n");
        })
        .join("\n")
    : "";

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
    productsContext,
    goalsContext,
    plansContext,
    brainContext: formatBrainContext(brainResults),
    channelsContext,
    icpContext,
    positioningContext,
    campaignMissionsContext,
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
