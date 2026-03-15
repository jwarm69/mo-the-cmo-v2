/**
 * GTM Briefing Engine — synthesizes GTM state into proactive recommendations.
 *
 * Runs on dashboard load. Queries for overdue milestones, inactive channels,
 * at-risk goals, content gaps, and recent brain entries suggesting strategic shifts.
 * Uses GPT-4o-mini to synthesize a structured briefing.
 */

import { and, eq, desc, sql, inArray, gte } from "drizzle-orm";
import { generateText } from "ai";
import { db } from "@/lib/db/client";
import {
  campaigns,
  gtmChannels,
  channelExperiments,
  marketingGoals,
  contentItems,
  contextEntries,
  customerProfiles,
} from "@/lib/db/schema";
import { gpt4oMini } from "@/lib/ai/providers/openai";

export interface GtmBriefing {
  urgentItems: string[];
  thisWeekPriorities: string[];
  channelHealth: {
    channel: string;
    status: string;
    concern?: string;
  }[];
  campaignProgress: {
    name: string;
    completionPercent: number;
    overdueCount: number;
    nextMilestone?: string;
  }[];
  icpInsights: string[];
  strategicRecommendation: string;
  generatedAt: string;
}

export async function generateGtmBriefing(orgId: string): Promise<GtmBriefing> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Parallel-fetch all GTM state
  const [
    activeCampaigns,
    activeChannels,
    activeGoals,
    recentContent,
    recentBrainEntries,
    icps,
  ] = await Promise.all([
    // Active campaigns with milestones
    db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        milestones: campaigns.milestones,
        completionPercent: campaigns.completionPercent,
        endDate: campaigns.endDate,
        successCriteria: campaigns.successCriteria,
      })
      .from(campaigns)
      .where(
        and(eq(campaigns.orgId, orgId), inArray(campaigns.status, ["active", "draft"]))
      )
      .orderBy(desc(campaigns.updatedAt))
      .limit(10),

    // Active/exploring channels
    db
      .select({
        id: gtmChannels.id,
        channel: gtmChannels.channel,
        status: gtmChannels.status,
        priority: gtmChannels.priority,
        updatedAt: gtmChannels.updatedAt,
      })
      .from(gtmChannels)
      .where(
        and(
          eq(gtmChannels.orgId, orgId),
          sql`${gtmChannels.status} NOT IN ('killed')`
        )
      )
      .orderBy(gtmChannels.priority),

    // Active goals
    db
      .select({
        title: marketingGoals.title,
        status: marketingGoals.status,
        targetMetric: marketingGoals.targetMetric,
        targetValue: marketingGoals.targetValue,
        currentValue: marketingGoals.currentValue,
        endDate: marketingGoals.endDate,
        timeframe: marketingGoals.timeframe,
      })
      .from(marketingGoals)
      .where(
        and(
          eq(marketingGoals.orgId, orgId),
          inArray(marketingGoals.status, ["not_started", "in_progress", "on_track", "at_risk"])
        )
      )
      .limit(10),

    // Recent content (last 7 days)
    db
      .select({
        platform: contentItems.platform,
        status: contentItems.status,
        contentType: contentItems.contentType,
      })
      .from(contentItems)
      .where(
        and(eq(contentItems.orgId, orgId), gte(contentItems.createdAt, sevenDaysAgo))
      ),

    // Recent brain entries suggesting strategic shifts
    db
      .select({
        type: contextEntries.type,
        title: contextEntries.title,
        content: contextEntries.content,
      })
      .from(contextEntries)
      .where(
        and(
          eq(contextEntries.orgId, orgId),
          eq(contextEntries.isActive, true),
          gte(contextEntries.createdAt, sevenDaysAgo),
          sql`${contextEntries.type} IN ('strategy_decision', 'market_insight', 'icp_insight', 'positioning_insight', 'channel_insight')`
        )
      )
      .orderBy(desc(contextEntries.createdAt))
      .limit(10),

    // ICPs
    db
      .select({ name: customerProfiles.name, isPrimary: customerProfiles.isPrimary })
      .from(customerProfiles)
      .where(and(eq(customerProfiles.orgId, orgId), eq(customerProfiles.status, "active")))
      .limit(5),
  ]);

  // Check for channels with no recent experiments
  const channelIdsWithExperiments = activeChannels.length > 0
    ? await db
        .select({ channelId: channelExperiments.channelId })
        .from(channelExperiments)
        .where(
          and(
            eq(channelExperiments.orgId, orgId),
            gte(channelExperiments.createdAt, sevenDaysAgo)
          )
        )
    : [];

  const recentExperimentChannelIds = new Set(channelIdsWithExperiments.map((r) => r.channelId));

  // Build structured data for the AI
  const campaignData = activeCampaigns.map((c) => {
    const milestones = (c.milestones ?? []) as Array<{
      title: string;
      dueDate: string;
      status: string;
    }>;
    const overdue = milestones.filter(
      (m) => m.status === "pending" && new Date(m.dueDate) < now
    );
    const next = milestones.find((m) => m.status === "pending");
    return {
      name: c.name,
      status: c.status,
      completionPercent: c.completionPercent ?? 0,
      overdueCount: overdue.length,
      overdueMilestones: overdue.map((m) => m.title),
      nextMilestone: next ? `${next.title} (due ${next.dueDate})` : null,
    };
  });

  const channelData = activeChannels.map((ch) => ({
    channel: ch.channel,
    status: ch.status,
    priority: ch.priority,
    hasRecentActivity: recentExperimentChannelIds.has(ch.id),
    daysSinceUpdate: Math.floor((now.getTime() - new Date(ch.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  const goalData = activeGoals.map((g) => {
    const progress = g.targetValue ? ((g.currentValue ?? 0) / g.targetValue) * 100 : 0;
    const daysLeft = g.endDate ? Math.ceil((new Date(g.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    return {
      title: g.title,
      status: g.status,
      progress: Math.round(progress),
      daysLeft,
      metric: g.targetMetric,
    };
  });

  const prompt = `You are Mo, the AI Go-To-Market Strategist. Generate a proactive GTM briefing.

## Active Campaigns
${JSON.stringify(campaignData, null, 2)}

## Channel Status
${JSON.stringify(channelData, null, 2)}

## Goal Progress
${JSON.stringify(goalData, null, 2)}

## Content Pipeline (last 7 days)
${recentContent.length} pieces created. Platforms: ${[...new Set(recentContent.map((c) => c.platform))].join(", ") || "none"}

## Recent Strategic Brain Entries
${recentBrainEntries.map((e) => `[${e.type}] ${e.title}: ${e.content}`).join("\n") || "None"}

## ICPs Defined
${icps.map((p) => `${p.name}${p.isPrimary ? " (primary)" : ""}`).join(", ") || "None"}

## Your Task
Synthesize this into a structured briefing. Be specific — reference actual campaign names, channels, goals.

Focus on:
1. What's urgent (overdue, at-risk, needs immediate attention)
2. What to focus on this week
3. Channel health assessment
4. Campaign progress
5. Any ICP or positioning insights from recent brain entries
6. One strategic recommendation

Respond in JSON (no markdown fences):
{
  "urgentItems": ["string — specific, actionable items"],
  "thisWeekPriorities": ["string — 3-5 specific priorities"],
  "channelHealth": [{ "channel": "string", "status": "string", "concern": "string or null" }],
  "campaignProgress": [{ "name": "string", "completionPercent": 0, "overdueCount": 0, "nextMilestone": "string or null" }],
  "icpInsights": ["string — insights from recent context"],
  "strategicRecommendation": "string — one key strategic recommendation"
}`;

  try {
    const { text } = await generateText({
      model: gpt4oMini,
      prompt,
      maxOutputTokens: 1000,
    });

    const briefing = JSON.parse(text) as Omit<GtmBriefing, "generatedAt">;
    return { ...briefing, generatedAt: now.toISOString() };
  } catch {
    // Fallback: build a basic briefing from raw data
    const urgentItems: string[] = [];
    for (const c of campaignData) {
      if (c.overdueCount > 0) {
        urgentItems.push(`Campaign "${c.name}" has ${c.overdueCount} overdue milestone(s): ${c.overdueMilestones.join(", ")}`);
      }
    }
    for (const g of goalData) {
      if (g.status === "at_risk") {
        urgentItems.push(`Goal "${g.title}" is at risk — ${g.progress}% complete with ${g.daysLeft ?? "?"} days left`);
      }
    }

    return {
      urgentItems: urgentItems.length > 0 ? urgentItems : ["No urgent items — keep executing the plan."],
      thisWeekPriorities: ["Review channel experiments", "Check campaign milestones", "Plan next week's content"],
      channelHealth: channelData.map((ch) => ({
        channel: ch.channel,
        status: ch.status,
        concern: !ch.hasRecentActivity && ch.status === "active" ? "No recent activity" : undefined,
      })),
      campaignProgress: campaignData.map((c) => ({
        name: c.name,
        completionPercent: c.completionPercent,
        overdueCount: c.overdueCount,
        nextMilestone: c.nextMilestone ?? undefined,
      })),
      icpInsights: [],
      strategicRecommendation: "Focus on executing experiments across your active channels this week.",
      generatedAt: now.toISOString(),
    };
  }
}
