import { NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { calendarSlots } from "@/lib/db/schema";
import type { Platform } from "@/lib/types";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const rows = await db
    .select()
    .from(calendarSlots)
    .where(and(eq(calendarSlots.orgId, org.id), eq(calendarSlots.isActive, true)))
    .orderBy(asc(calendarSlots.dayOfWeek), asc(calendarSlots.timeSlot));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  // Support bulk creation (seed defaults) or single slot
  const slots: { platform: Platform; dayOfWeek: number; timeSlot: string; contentPillar?: string }[] =
    Array.isArray(body.slots) ? body.slots : [body];

  if (slots.length === 0 || !slots[0].platform) {
    return NextResponse.json({ error: "platform, dayOfWeek, and timeSlot are required" }, { status: 400 });
  }

  const created = await db
    .insert(calendarSlots)
    .values(
      slots.map((s) => ({
        orgId: org.id,
        platform: s.platform,
        dayOfWeek: s.dayOfWeek,
        timeSlot: s.timeSlot,
        contentPillar: s.contentPillar || null,
      }))
    )
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

  const setValues: Record<string, unknown> = {};
  if (updates.platform !== undefined) setValues.platform = updates.platform;
  if (updates.dayOfWeek !== undefined) setValues.dayOfWeek = updates.dayOfWeek;
  if (updates.timeSlot !== undefined) setValues.timeSlot = updates.timeSlot;
  if (updates.contentPillar !== undefined) setValues.contentPillar = updates.contentPillar || null;
  if (updates.isActive !== undefined) setValues.isActive = updates.isActive;

  const [updated] = await db
    .update(calendarSlots)
    .set(setValues)
    .where(and(eq(calendarSlots.id, id), eq(calendarSlots.orgId, org.id)))
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
    .delete(calendarSlots)
    .where(and(eq(calendarSlots.id, id), eq(calendarSlots.orgId, org.id)))
    .returning({ id: calendarSlots.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
