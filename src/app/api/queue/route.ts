import { NextResponse } from "next/server";
import { and, asc, count, eq, gte, lte, or } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { campaigns, contentItems } from "@/lib/db/schema";

type QueuePriority = "high" | "medium" | "low";
type QueueActionType = "approve" | "publish" | "none";

interface QueueItem {
  id: string;
  type: "approval" | "stale" | "campaign" | "plan";
  title: string;
  description: string;
  priority: QueuePriority;
  actionLabel: string;
  actionHref: string;
  actionType: QueueActionType;
  contentId?: string;
}

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const [pendingItems, recentCountResult, scheduledNextWeekResult, endingCampaigns] = await Promise.all([
    db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        body: contentItems.body,
        platform: contentItems.platform,
        status: contentItems.status,
        createdAt: contentItems.createdAt,
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, org.id),
          or(eq(contentItems.status, "draft"), eq(contentItems.status, "pending_approval"))
        )
      )
      .orderBy(asc(contentItems.createdAt))
      .limit(5),
    db
      .select({ value: count() })
      .from(contentItems)
      .where(and(eq(contentItems.orgId, org.id), gte(contentItems.createdAt, threeDaysAgo))),
    db
      .select({ value: count() })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.orgId, org.id),
          eq(contentItems.status, "scheduled"),
          gte(contentItems.scheduledAt, now),
          lte(contentItems.scheduledAt, sevenDaysFromNow)
        )
      ),
    db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        endDate: campaigns.endDate,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.orgId, org.id),
          eq(campaigns.status, "active"),
          gte(campaigns.endDate, now),
          lte(campaigns.endDate, sevenDaysFromNow)
        )
      ),
  ]);

  const queue: QueueItem[] = [];

  for (const item of pendingItems) {
    queue.push({
      id: `approval-${item.id}`,
      type: "approval",
      title: `Approve ${item.platform} draft`,
      description: item.title || item.body.slice(0, 96),
      priority: "high",
      actionLabel: "Approve",
      actionHref: "/content?status=draft",
      actionType: "approve",
      contentId: item.id,
    });
  }

  const recentCount = Number(recentCountResult[0]?.value ?? 0);
  if (recentCount === 0) {
    queue.push({
      id: "stale-content",
      type: "stale",
      title: "No new content in 3 days",
      description: "Run a weekly plan to rebuild momentum.",
      priority: "high",
      actionLabel: "Plan Week",
      actionHref: "/plan",
      actionType: "none",
    });
  }

  const scheduledNextWeek = Number(scheduledNextWeekResult[0]?.value ?? 0);
  if (scheduledNextWeek < 3) {
    queue.push({
      id: "light-schedule",
      type: "plan",
      title: "Schedule is light for next 7 days",
      description: `${scheduledNextWeek} item${scheduledNextWeek === 1 ? "" : "s"} currently scheduled.`,
      priority: "medium",
      actionLabel: "Generate Week",
      actionHref: "/plan",
      actionType: "none",
    });
  }

  for (const campaign of endingCampaigns) {
    const daysLeft = Math.ceil(
      (new Date(campaign.endDate as Date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    queue.push({
      id: `campaign-${campaign.id}`,
      type: "campaign",
      title: `"${campaign.name}" ending soon`,
      description: `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining on active campaign.`,
      priority: "medium",
      actionLabel: "Open Campaigns",
      actionHref: "/campaigns",
      actionType: "none",
    });
  }

  return NextResponse.json({
    orgName: org.name,
    pendingApprovals: pendingItems.length,
    recentContentCount: recentCount,
    scheduledNextWeek,
    items: queue.slice(0, 10),
  });
}
