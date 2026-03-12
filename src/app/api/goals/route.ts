import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { marketingGoals, products } from "@/lib/db/schema";
import { captureContext } from "@/lib/brain/context-brain";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const url = new URL(req.url);
  const timeframe = url.searchParams.get("timeframe");
  const status = url.searchParams.get("status");

  let whereClause = eq(marketingGoals.orgId, org.id);
  if (timeframe) {
    whereClause = and(
      whereClause,
      eq(marketingGoals.timeframe, timeframe as "quarterly")
    )!;
  }
  if (status) {
    whereClause = and(
      whereClause,
      eq(marketingGoals.status, status as "in_progress")
    )!;
  }

  const rows = await db
    .select({
      goal: marketingGoals,
      productName: products.name,
    })
    .from(marketingGoals)
    .leftJoin(products, eq(marketingGoals.productId, products.id))
    .where(whereClause)
    .orderBy(desc(marketingGoals.createdAt));

  return NextResponse.json(
    rows.map((r) => ({ ...r.goal, productName: r.productName }))
  );
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const {
    productId,
    title,
    description,
    timeframe,
    targetMetric,
    targetValue,
    startDate,
    endDate,
    parentGoalId,
  } = body as {
    productId?: string;
    title?: string;
    description?: string;
    timeframe?: string;
    targetMetric?: string;
    targetValue?: number;
    startDate?: string;
    endDate?: string;
    parentGoalId?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!timeframe) {
    return NextResponse.json(
      { error: "timeframe is required" },
      { status: 400 }
    );
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(marketingGoals)
    .values({
      orgId: org.id,
      productId: productId || null,
      title: title.trim(),
      description: description || null,
      timeframe: timeframe as "quarterly",
      targetMetric: targetMetric || null,
      targetValue: targetValue ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      parentGoalId: parentGoalId || null,
    })
    .returning();

  // Auto-capture into company brain
  const contextParts = [
    `Goal: ${title}`,
    description ? `Description: ${description}` : null,
    `Timeframe: ${timeframe}`,
    targetMetric && targetValue
      ? `Target: ${targetValue} ${targetMetric}`
      : null,
    startDate && endDate ? `Period: ${startDate} to ${endDate}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  captureContext({
    orgId: org.id,
    type: "goal_context",
    title: `Goal: ${title}`,
    content: contextParts,
    source: "goal_create",
    sourceId: created.id,
    confidence: 1.0,
  }).catch(() => {});

  return NextResponse.json(created, { status: 201 });
}
