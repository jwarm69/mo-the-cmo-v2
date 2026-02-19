import { NextResponse } from "next/server";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import {
  contentItems,
  agentLearnings,
  knowledgeDocuments,
  usageTracking,
  brandProfiles,
} from "@/lib/db/schema";
import { normalizeBrandProfile } from "@/lib/brand/defaults";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  // Get content created per week for last 8 weeks
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const [
    weeklyContent,
    statusCounts,
    platformCounts,
    learningCount,
    docCount,
    weeklyUsage,
    brandRecord,
  ] = await Promise.all([
    // Content per week
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${contentItems.createdAt}), 'YYYY-MM-DD')`,
        platform: contentItems.platform,
        count: count(),
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, org.id),
          gte(contentItems.createdAt, eightWeeksAgo)
        )
      )
      .groupBy(
        sql`date_trunc('week', ${contentItems.createdAt})`,
        contentItems.platform
      )
      .orderBy(sql`date_trunc('week', ${contentItems.createdAt})`),

    // Pipeline funnel
    db
      .select({
        status: contentItems.status,
        count: count(),
      })
      .from(contentItems)
      .where(eq(contentItems.orgId, org.id))
      .groupBy(contentItems.status),

    // Platform distribution
    db
      .select({
        platform: contentItems.platform,
        count: count(),
      })
      .from(contentItems)
      .where(eq(contentItems.orgId, org.id))
      .groupBy(contentItems.platform),

    // Learnings count
    db
      .select({ value: count() })
      .from(agentLearnings)
      .where(eq(agentLearnings.orgId, org.id)),

    // Knowledge docs count
    db
      .select({ value: count() })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.orgId, org.id)),

    // Usage per week
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${usageTracking.createdAt}), 'YYYY-MM-DD')`,
        totalCost: sql<number>`sum(${usageTracking.costCents})`,
        totalTokens: sql<number>`sum(${usageTracking.totalTokens})`,
      })
      .from(usageTracking)
      .where(gte(usageTracking.createdAt, eightWeeksAgo))
      .groupBy(sql`date_trunc('week', ${usageTracking.createdAt})`)
      .orderBy(sql`date_trunc('week', ${usageTracking.createdAt})`),

    // Brand profile for pillar targets
    db
      .select({
        contentPillars: brandProfiles.contentPillars,
      })
      .from(brandProfiles)
      .where(eq(brandProfiles.orgId, org.id))
      .limit(1),
  ]);

  // Compute pillar distribution from content metadata
  const allContent = await db
    .select({ metadata: contentItems.metadata })
    .from(contentItems)
    .where(eq(contentItems.orgId, org.id));

  const pillarCounts: Record<string, number> = {};
  for (const row of allContent) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const pillar = (meta.pillar as string) || "General";
    pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1;
  }

  const brand = brandRecord[0]
    ? normalizeBrandProfile({ contentPillars: brandRecord[0].contentPillars ?? undefined })
    : null;

  const pillarTargets = brand?.contentPillars?.map((p) => ({
    name: p.name,
    targetRatio: p.ratio,
  })) ?? [];

  return NextResponse.json({
    weeklyContent,
    statusCounts,
    platformCounts,
    pillarDistribution: Object.entries(pillarCounts).map(([name, count]) => ({
      name,
      count,
    })),
    pillarTargets,
    learnings: learningCount[0]?.value ?? 0,
    knowledgeDocs: docCount[0]?.value ?? 0,
    weeklyUsage,
  });
}
