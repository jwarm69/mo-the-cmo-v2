import { NextResponse } from "next/server";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { performanceMetrics, contentItems } from "@/lib/db/schema";
import { analyzePerformanceBatch } from "@/lib/ai/performance-analyzer";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const { id } = await context.params;

  // Verify content exists and belongs to this org
  const [content] = await db
    .select({ id: contentItems.id, platform: contentItems.platform })
    .from(contentItems)
    .where(and(eq(contentItems.id, id), eq(contentItems.orgId, org.id)))
    .limit(1);

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const {
    platform,
    likes,
    comments,
    shares,
    saves,
    reach,
    impressions,
    clicks,
    rating,
    notes,
  } = body as {
    platform?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    reach?: number;
    impressions?: number;
    clicks?: number;
    rating?: "positive" | "negative";
    notes?: string;
  };

  // Calculate engagement rate: (likes + comments + shares) / reach
  const engagementRate =
    reach && reach > 0
      ? ((likes || 0) + (comments || 0) + (shares || 0)) / reach
      : null;

  const [metric] = await db
    .insert(performanceMetrics)
    .values({
      orgId: org.id,
      contentItemId: id,
      platform: (platform as typeof content.platform) || content.platform,
      date: new Date(),
      likes: likes || 0,
      comments: comments || 0,
      shares: shares || 0,
      saves: saves || 0,
      reach: reach || 0,
      impressions: impressions || 0,
      clicks: clicks || 0,
      engagementRate,
      rawData: { rating, notes },
    })
    .returning();

  // Update content status to "scored"
  await db
    .update(contentItems)
    .set({ status: "scored", updatedAt: new Date() })
    .where(eq(contentItems.id, id));

  // Count total metrics for org; fire batch analysis every 5th entry
  const [{ value: totalLogged }] = await db
    .select({ value: count() })
    .from(performanceMetrics)
    .where(eq(performanceMetrics.orgId, org.id));

  if (totalLogged > 0 && totalLogged % 5 === 0) {
    analyzePerformanceBatch(org.id).catch(() => {});
  }

  return NextResponse.json(
    {
      success: true,
      metricsId: metric.id,
      engagementRate,
    },
    { status: 201 }
  );
}
