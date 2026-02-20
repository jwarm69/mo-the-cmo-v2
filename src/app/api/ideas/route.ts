import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { ideas } from "@/lib/db/schema";

type IdeaPlatform = typeof ideas.$inferInsert.platform;

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const conditions = [eq(ideas.orgId, org.id)];
  if (status) {
    conditions.push(eq(ideas.status, status as "captured" | "in_progress" | "used" | "dismissed"));
  }

  const rows = await db
    .select()
    .from(ideas)
    .where(and(...conditions))
    .orderBy(desc(ideas.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const { text, platform, pillar, source } = body as {
    text: string;
    platform?: string;
    pillar?: string;
    source?: string;
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(ideas)
    .values({
      orgId: org.id,
      text: text.trim(),
      platform: (platform as IdeaPlatform | undefined) ?? null,
      pillar: pillar || null,
      source: source || "manual",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.status) setValues.status = updates.status;
  if (updates.text) setValues.text = updates.text;
  if (updates.platform !== undefined) setValues.platform = updates.platform || null;
  if (updates.pillar !== undefined) setValues.pillar = updates.pillar || null;

  const [updated] = await db
    .update(ideas)
    .set(setValues)
    .where(and(eq(ideas.id, id), eq(ideas.orgId, org.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const result = await db
    .delete(ideas)
    .where(and(eq(ideas.id, id), eq(ideas.orgId, org.id)))
    .returning({ id: ideas.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
