import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import {
  marketingPlans,
  marketingGoals,
  products,
  tactics,
} from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");

  let whereClause = eq(marketingPlans.orgId, org.id);
  if (type) {
    whereClause = and(
      whereClause,
      eq(marketingPlans.type, type as "quarterly")
    )!;
  }
  if (status) {
    whereClause = and(
      whereClause,
      eq(marketingPlans.status, status as "active")
    )!;
  }

  const rows = await db
    .select({
      plan: marketingPlans,
      goalTitle: marketingGoals.title,
      productName: products.name,
    })
    .from(marketingPlans)
    .leftJoin(marketingGoals, eq(marketingPlans.goalId, marketingGoals.id))
    .leftJoin(products, eq(marketingPlans.productId, products.id))
    .where(whereClause)
    .orderBy(desc(marketingPlans.createdAt));

  return NextResponse.json(
    rows.map((r) => ({
      ...r.plan,
      goalTitle: r.goalTitle,
      productName: r.productName,
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const {
    parentPlanId,
    goalId,
    productId,
    campaignId,
    type,
    title,
    theme,
    summary,
    strategy,
    startDate,
    endDate,
    channelMix,
    keyMessages,
  } = body as {
    parentPlanId?: string;
    goalId?: string;
    productId?: string;
    campaignId?: string;
    type?: string;
    title?: string;
    theme?: string;
    summary?: string;
    strategy?: string;
    startDate?: string;
    endDate?: string;
    channelMix?: { channel: string; weight: number; rationale: string }[];
    keyMessages?: string[];
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(marketingPlans)
    .values({
      orgId: org.id,
      parentPlanId: parentPlanId || null,
      goalId: goalId || null,
      productId: productId || null,
      campaignId: campaignId || null,
      type: type as "quarterly",
      title: title.trim(),
      theme: theme || null,
      summary: summary || null,
      strategy: strategy || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      channelMix: channelMix || null,
      keyMessages: keyMessages || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
