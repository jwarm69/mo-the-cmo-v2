import { desc, eq } from "drizzle-orm";
import { generateText } from "ai";
import { gpt4oMini } from "@/lib/ai/providers/openai";
import { db } from "@/lib/db/client";
import { performanceMetrics, contentItems } from "@/lib/db/schema";
import { storeLearning } from "@/lib/memory/long-term";
import { captureContext } from "@/lib/brain/context-brain";

/**
 * Analyze the last 20 performance metrics for an org and extract patterns.
 * Stores each pattern as an agentLearning and the full summary as a
 * context entry (performance_insight) in the company brain.
 *
 * This is non-critical — all work is wrapped in try/catch so callers
 * can fire-and-forget without blocking user-facing responses.
 */
export async function analyzePerformanceBatch(orgId: string): Promise<void> {
  try {
    // Fetch last 20 metrics with LEFT JOIN to contentItems for context
    const recentMetrics = await db
      .select({
        impressions: performanceMetrics.impressions,
        reach: performanceMetrics.reach,
        likes: performanceMetrics.likes,
        comments: performanceMetrics.comments,
        shares: performanceMetrics.shares,
        saves: performanceMetrics.saves,
        engagementRate: performanceMetrics.engagementRate,
        platform: performanceMetrics.platform,
        rawData: performanceMetrics.rawData,
        contentTitle: contentItems.title,
        contentBody: contentItems.body,
        contentMetadata: contentItems.metadata,
      })
      .from(performanceMetrics)
      .leftJoin(
        contentItems,
        eq(performanceMetrics.contentItemId, contentItems.id)
      )
      .where(eq(performanceMetrics.orgId, orgId))
      .orderBy(desc(performanceMetrics.createdAt))
      .limit(20);

    if (recentMetrics.length < 3) return;

    const metricsText = recentMetrics
      .map((m, i) => {
        const meta = (m.contentMetadata ?? {}) as Record<string, unknown>;
        const rawData = (m.rawData ?? {}) as Record<string, unknown>;
        return `[${i + 1}] ${m.platform} | Hook: "${m.contentTitle || "N/A"}" | Pillar: ${meta.pillar || "?"} | Body format: ${meta.body_format || "?"} | Likes: ${m.likes} | Comments: ${m.comments} | Shares: ${m.shares} | Saves: ${m.saves} | Reach: ${m.reach} | Rate: ${m.engagementRate?.toFixed(3) || "?"} | Rating: ${rawData.rating || "?"} | Notes: ${rawData.notes || ""}`;
      })
      .join("\n");

    const { text } = await generateText({
      model: gpt4oMini,
      prompt: `You are Mo, a marketing performance analyst. Analyze these content performance results and extract patterns.

## Recent Performance Data
${metricsText}

## Your Task
Identify the top patterns from this performance data. Focus on:
1. What works — which hooks, formats, pillars drive the most engagement?
2. What doesn't work — which approaches consistently underperform?
3. Recommendations — actionable next steps based on the data.

Respond in JSON (no markdown fences):
{
  "patterns": [
    {
      "insight": "Specific, actionable insight about what works or doesn't",
      "category": "performance_feedback",
      "confidence": "validated",
      "evidence": "Brief evidence from the data"
    }
  ],
  "summary": "One paragraph summary of overall performance trends, top patterns, and recommendations"
}`,
    });

    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const result = JSON.parse(cleaned) as {
      patterns: {
        insight: string;
        category: string;
        confidence: string;
        evidence: string;
      }[];
      summary: string;
    };

    // Store each pattern as a learning
    for (const pattern of result.patterns) {
      await storeLearning(orgId, {
        insight: pattern.insight,
        category: "performance_feedback",
        confidence: "validated",
        weight: 2.5,
      });
    }

    // Store full summary as performance_insight in company brain
    await captureContext({
      orgId,
      type: "performance_insight",
      title: "Performance Batch Analysis",
      content: result.summary,
      source: "performance_analysis",
      confidence: 0.85,
    });
  } catch {
    // Non-critical — analysis failed but metrics are still stored
  }
}

// Keep backwards-compatible alias
export const analyzePerformance = analyzePerformanceBatch;
