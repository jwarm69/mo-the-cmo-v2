import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { tactics } from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const url = new URL(req.url);
  const planId = url.searchParams.get("planId");
  const channel = url.searchParams.get("channel");
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");

  let whereClause = eq(tactics.orgId, org.id);
  if (planId) {
    whereClause = and(whereClause, eq(tactics.planId, planId))!;
  }
  if (channel) {
    whereClause = and(whereClause, eq(tactics.channel, channel))!;
  }
  if (status) {
    whereClause = and(
      whereClause,
      eq(tactics.status, status as "planned")
    )!;
  }
  if (category) {
    whereClause = and(whereClause, eq(tactics.channelCategory, category))!;
  }

  const rows = await db
    .select()
    .from(tactics)
    .where(whereClause)
    .orderBy(desc(tactics.scheduledDate));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const {
    planId,
    campaignId,
    contentItemId,
    channel,
    channelCategory,
    title,
    description,
    scheduledDate,
    effort,
    cost,
    expectedOutcome,
  } = body as {
    planId?: string;
    campaignId?: string;
    contentItemId?: string;
    channel?: string;
    channelCategory?: string;
    title?: string;
    description?: string;
    scheduledDate?: string;
    effort?: string;
    cost?: number;
    expectedOutcome?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!channel?.trim()) {
    return NextResponse.json({ error: "channel is required" }, { status: 400 });
  }
  if (!channelCategory?.trim()) {
    return NextResponse.json(
      { error: "channelCategory is required" },
      { status: 400 }
    );
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(tactics)
    .values({
      orgId: org.id,
      planId: planId || null,
      campaignId: campaignId || null,
      contentItemId: contentItemId || null,
      channel: channel.trim(),
      channelCategory: channelCategory.trim(),
      title: title.trim(),
      description: description || null,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      effort: effort || null,
      cost: cost ?? null,
      expectedOutcome: expectedOutcome || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
