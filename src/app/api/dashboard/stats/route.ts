import { NextResponse } from "next/server";
import { and, avg, count, desc, eq, gte, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import {
  contentItems,
  campaigns,
  agentLearnings,
  usageTracking,
} from "@/lib/db/schema";

interface StatusCount {
  status: string;
  count: number;
}

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  // Start of current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run queries in parallel
  const [
    statusCounts,
    contentThisMonth,
    avgScore,
    campaignCounts,
    learningsCount,
    recentContent,
    usageResult,
  ] = await Promise.all([
    // Content counts by status
    db
      .select({
        status: contentItems.status,
        count: count(),
      })
      .from(contentItems)
      .where(eq(contentItems.orgId, org.id))
      .groupBy(contentItems.status),

    // Content created this month
    db
      .select({ count: count() })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, org.id),
          gte(contentItems.createdAt, monthStart)
        )
      ),

    // Average performance score
    db
      .select({
        avg: avg(contentItems.performanceScore),
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, org.id),
          sql`${contentItems.performanceScore} IS NOT NULL`
        )
      ),

    // Campaign counts by status
    db
      .select({
        status: campaigns.status,
        count: count(),
      })
      .from(campaigns)
      .where(eq(campaigns.orgId, org.id))
      .groupBy(campaigns.status),

    // Learnings count
    db
      .select({ count: count() })
      .from(agentLearnings)
      .where(eq(agentLearnings.orgId, org.id)),

    // Recent content items (last 8)
    db
      .select({
        id: contentItems.id,
        platform: contentItems.platform,
        status: contentItems.status,
        title: contentItems.title,
        body: contentItems.body,
        performanceScore: contentItems.performanceScore,
        metadata: contentItems.metadata,
        createdAt: contentItems.createdAt,
      })
      .from(contentItems)
      .where(eq(contentItems.orgId, org.id))
      .orderBy(desc(contentItems.createdAt))
      .limit(8),

    // Usage spent this month (org- and user-scoped)
    user.isApiKeyUser
      ? Promise.resolve([{ total: 0 }])
      : db
          .select({
            total: sql<number>`coalesce(sum(${usageTracking.costCents}), 0)`,
          })
          .from(usageTracking)
          .where(
            and(
              eq(usageTracking.userId, user.id),
              eq(usageTracking.orgId, org.id),
              gte(usageTracking.createdAt, monthStart)
            )
          ),
  ]);

  // Build status count map
  const statusMap: Record<string, number> = {};
  for (const row of statusCounts as StatusCount[]) {
    statusMap[row.status] = Number(row.count);
  }

  // Build campaign totals
  let activeCampaigns = 0;
  let totalCampaigns = 0;
  for (const row of campaignCounts as StatusCount[]) {
    totalCampaigns += Number(row.count);
    if (row.status === "active") activeCampaigns = Number(row.count);
  }

  // Format recent activity
  const recentActivity = recentContent.map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      platform: row.platform,
      status: row.status,
      title: row.title || (row.body?.slice(0, 60) + "..."),
      performanceScore: row.performanceScore,
      hasAgentLoop: !!meta.agentLoop,
      createdAt: row.createdAt,
    };
  });

  return NextResponse.json({
    orgName: org.name,
    pipeline: {
      draft: statusMap["draft"] ?? 0,
      pending_approval: statusMap["pending_approval"] ?? 0,
      approved: statusMap["approved"] ?? 0,
      scheduled: statusMap["scheduled"] ?? 0,
      published: statusMap["published"] ?? 0,
    },
    contentThisMonth: Number(contentThisMonth[0]?.count ?? 0),
    avgPerformanceScore: avgScore[0]?.avg ? Math.round(Number(avgScore[0].avg)) : null,
    activeCampaigns,
    totalCampaigns,
    learningsCount: Number(learningsCount[0]?.count ?? 0),
    recentActivity,
    usage: {
      spentCents: Number(usageResult[0]?.total ?? 0),
      limitCents: user.usageLimitCents,
    },
  });
}
