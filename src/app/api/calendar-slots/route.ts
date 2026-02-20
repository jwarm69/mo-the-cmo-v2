import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { calendarSlots } from "@/lib/db/schema";
import type { Platform } from "@/lib/types";

interface SlotInput {
  platform: Platform;
  dayOfWeek: number;
  timeSlot: string;
  contentPillar?: string;
}

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

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
  const slots = (Array.isArray(body.slots) ? body.slots : [body]) as SlotInput[];

  if (!slots.length) {
    return NextResponse.json({ error: "At least one slot is required" }, { status: 400 });
  }

  for (const slot of slots) {
    if (!slot.platform || slot.dayOfWeek < 0 || slot.dayOfWeek > 6 || !isValidTime(slot.timeSlot)) {
      return NextResponse.json(
        { error: "Each slot must include valid platform, dayOfWeek (0-6), and timeSlot (HH:MM)" },
        { status: 400 }
      );
    }
  }

  const inserted = await db
    .insert(calendarSlots)
    .values(
      slots.map((slot) => ({
        orgId: org.id,
        platform: slot.platform,
        dayOfWeek: slot.dayOfWeek,
        timeSlot: slot.timeSlot,
        contentPillar: slot.contentPillar ?? null,
      }))
    )
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const { id, ...updates } = body as { id?: string } & Partial<SlotInput> & { isActive?: boolean };
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (updates.timeSlot !== undefined && !isValidTime(updates.timeSlot)) {
    return NextResponse.json({ error: "timeSlot must be HH:MM" }, { status: 400 });
  }
  if (updates.dayOfWeek !== undefined && (updates.dayOfWeek < 0 || updates.dayOfWeek > 6)) {
    return NextResponse.json({ error: "dayOfWeek must be 0-6" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const [updated] = await db
    .update(calendarSlots)
    .set({
      platform: updates.platform,
      dayOfWeek: updates.dayOfWeek,
      timeSlot: updates.timeSlot,
      contentPillar: updates.contentPillar === undefined ? undefined : updates.contentPillar || null,
      isActive: updates.isActive,
    })
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

  const body = await req.json();
  const id = body?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const deleted = await db
    .delete(calendarSlots)
    .where(and(eq(calendarSlots.id, id), eq(calendarSlots.orgId, org.id)))
    .returning({ id: calendarSlots.id });

  if (!deleted.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
