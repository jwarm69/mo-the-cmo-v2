import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { campaigns, contentItems } from "@/lib/db/schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.orgId, org.id)))
    .limit(1);

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const content = await db
    .select()
    .from(contentItems)
    .where(eq(contentItems.campaignId, id));

  return NextResponse.json({ ...campaign, contentItems: content });
}

export async function PUT(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const body = await req.json();

  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) setValues.name = body.name;
  if (body.description !== undefined) setValues.description = body.description;
  if (body.objective !== undefined) setValues.objective = body.objective;
  if (body.status !== undefined) setValues.status = body.status;
  if (body.platforms !== undefined) setValues.platforms = body.platforms;
  if (body.startDate !== undefined) setValues.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) setValues.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.budget !== undefined) setValues.budget = body.budget;
  if (body.metrics !== undefined) setValues.metrics = body.metrics;

  const [updated] = await db
    .update(campaigns)
    .set(setValues)
    .where(and(eq(campaigns.id, id), eq(campaigns.orgId, org.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const result = await db
    .delete(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.orgId, org.id)))
    .returning({ id: campaigns.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
