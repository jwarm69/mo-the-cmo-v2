/**
 * Performance feedback loop: analyze published content metrics and
 * auto-generate learnings for the AI to use in future content planning.
 *
 * POST /api/analytics/learn
 *
 * Looks at content with performance metrics, compares top vs bottom performers,
 * and creates learnings like "TikTok hooks phrased as questions get 2x engagement".
 */

import { NextResponse } from "next/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { generateText } from "ai";
import { gpt4oMini } from "@/lib/ai/providers/openai";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { contentItems, performanceMetrics } from "@/lib/db/schema";
import { storeLearning } from "@/lib/memory/long-term";
import { recordUsage } from "@/lib/usage/tracker";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json().catch(() => ({}));
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  // Fetch published content that has performance metrics
  const scoredContent = await db
    .select({
      id: contentItems.id,
      platform: contentItems.platform,
      title: contentItems.title,
      body: contentItems.body,
      metadata: contentItems.metadata,
      hashtags: contentItems.hashtags,
      impressions: performanceMetrics.impressions,
      engagement: performanceMetrics.engagement,
      engagementRate: performanceMetrics.engagementRate,
      clicks: performanceMetrics.clicks,
      shares: performanceMetrics.shares,
      saves: performanceMetrics.saves,
      likes: performanceMetrics.likes,
      comments: performanceMetrics.comments,
    })
    .from(contentItems)
    .innerJoin(
      performanceMetrics,
      eq(contentItems.id, performanceMetrics.contentItemId)
    )
    .where(
      and(
        eq(contentItems.orgId, org.id),
        isNotNull(performanceMetrics.engagementRate)
      )
    )
    .orderBy(desc(performanceMetrics.engagementRate))
    .limit(30);

  if (scoredContent.length < 4) {
    return NextResponse.json({
      success: false,
      message:
        "Not enough performance data yet. Need at least 4 content items with engagement metrics.",
      analyzed: scoredContent.length,
    });
  }

  // Split into top and bottom performers
  const topCount = Math.max(3, Math.ceil(scoredContent.length * 0.3));
  const topPerformers = scoredContent.slice(0, topCount);
  const bottomPerformers = scoredContent.slice(-topCount);

  const formatContent = (items: typeof scoredContent) =>
    items
      .map((c) => {
        const meta = (c.metadata ?? {}) as Record<string, unknown>;
        const pillar = (meta.pillar as string) || "General";
        const topic = (meta.topic as string) || "";
        const hook = c.title || "(no hook)";
        const hashtags = (c.hashtags as string[])?.join(" ") || "";
        return `- [${c.platform}] pillar="${pillar}" topic="${topic}" hook="${hook}" hashtags="${hashtags}" | engagement_rate=${c.engagementRate?.toFixed(3)} impressions=${c.impressions} likes=${c.likes} shares=${c.shares} saves=${c.saves} comments=${c.comments}`;
      })
      .join("\n");

  const prompt = `You are analyzing content performance data to extract actionable learnings for a marketing AI.

## Top Performers (highest engagement rate)
${formatContent(topPerformers)}

## Bottom Performers (lowest engagement rate)
${formatContent(bottomPerformers)}

## Your Task
Identify 3-5 specific, actionable patterns by comparing top vs bottom performers. Focus on:
1. What hook styles, formats, or topics drive the most engagement?
2. Which platforms perform best for which content pillars?
3. What patterns in timing, hashtags, or content structure correlate with performance?

For each insight, be specific and data-grounded — reference the actual content that demonstrates the pattern.

Respond as a JSON array (no markdown code fences):
[
  {
    "insight": "Specific, actionable finding (e.g., 'TikTok hooks that start with a question get 2x the engagement rate of statement-based hooks')",
    "category": "performance_insight",
    "confidence": "medium" or "high",
    "evidence_summary": "Brief reference to which content items demonstrate this"
  }
]`;

  const { text, usage } = await generateText({
    model: gpt4oMini,
    prompt,
  });

  if (!user.isApiKeyUser && usage) {
    await recordUsage({
      userId: user.id,
      orgId: org.id,
      model: "gpt-4o-mini",
      route: "/api/analytics/learn",
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    });
  }

  let insights: Array<{
    insight: string;
    category: string;
    confidence: "low" | "medium" | "high";
    evidence_summary: string;
  }>;
  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    insights = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to parse AI analysis" },
      { status: 500 }
    );
  }

  // Store each insight as a learning
  const stored = [];
  for (const insight of insights) {
    try {
      const learning = await storeLearning(org.id, {
        insight: insight.insight,
        category: insight.category || "performance_insight",
        confidence: insight.confidence || "medium",
        weight: insight.confidence === "high" ? 2.5 : 2.0,
      });
      stored.push(learning);
    } catch {
      // Non-critical — continue with remaining insights
    }
  }

  return NextResponse.json({
    success: true,
    analyzed: scoredContent.length,
    topPerformers: topCount,
    insightsGenerated: insights.length,
    insightsStored: stored.length,
    insights: insights.map((i) => ({
      insight: i.insight,
      confidence: i.confidence,
    })),
  });
}
