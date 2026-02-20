/**
 * Default posting cadence and helpers for resolving an org's calendar slots.
 */

import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { calendarSlots } from "@/lib/db/schema";
import type { Platform } from "@/lib/types";

export interface CadenceSlot {
  platform: Platform;
  dayOfWeek: number; // 0=Sun, 6=Sat
  timeSlot: string;  // HH:MM
  contentPillar?: string | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Sensible default cadence when an org hasn't configured their own.
 * Covers TikTok (daily), Instagram (4x/week), and Twitter (2x/week).
 */
export const DEFAULT_CADENCE: CadenceSlot[] = [
  // Monday
  { platform: "tiktok", dayOfWeek: 1, timeSlot: "12:00" },
  { platform: "instagram", dayOfWeek: 1, timeSlot: "18:00" },
  // Tuesday
  { platform: "tiktok", dayOfWeek: 2, timeSlot: "12:00" },
  { platform: "twitter", dayOfWeek: 2, timeSlot: "17:00" },
  // Wednesday
  { platform: "tiktok", dayOfWeek: 3, timeSlot: "12:00" },
  { platform: "instagram", dayOfWeek: 3, timeSlot: "18:00" },
  // Thursday
  { platform: "tiktok", dayOfWeek: 4, timeSlot: "12:00" },
  { platform: "twitter", dayOfWeek: 4, timeSlot: "17:00" },
  // Friday
  { platform: "tiktok", dayOfWeek: 5, timeSlot: "12:00" },
  { platform: "instagram", dayOfWeek: 5, timeSlot: "18:00" },
  // Saturday
  { platform: "tiktok", dayOfWeek: 6, timeSlot: "11:00" },
  { platform: "instagram", dayOfWeek: 6, timeSlot: "15:00" },
  // Sunday
  { platform: "tiktok", dayOfWeek: 0, timeSlot: "14:00" },
  { platform: "instagram", dayOfWeek: 0, timeSlot: "18:00" },
];

/**
 * Get the resolved posting cadence for an org.
 * Returns DB-configured slots if any exist, otherwise returns defaults.
 */
export async function getOrgCadence(orgId: string): Promise<CadenceSlot[]> {
  const rows = await db
    .select({
      platform: calendarSlots.platform,
      dayOfWeek: calendarSlots.dayOfWeek,
      timeSlot: calendarSlots.timeSlot,
      contentPillar: calendarSlots.contentPillar,
    })
    .from(calendarSlots)
    .where(and(eq(calendarSlots.orgId, orgId), eq(calendarSlots.isActive, true)))
    .orderBy(asc(calendarSlots.dayOfWeek), asc(calendarSlots.timeSlot));

  if (rows.length > 0) {
    return rows.map((r) => ({
      platform: r.platform as Platform,
      dayOfWeek: r.dayOfWeek,
      timeSlot: r.timeSlot,
      contentPillar: r.contentPillar,
    }));
  }

  return DEFAULT_CADENCE;
}

/**
 * Seed the default cadence into the DB for an org.
 */
export async function seedDefaultCadence(orgId: string): Promise<void> {
  await db.insert(calendarSlots).values(
    DEFAULT_CADENCE.map((slot) => ({
      orgId,
      platform: slot.platform,
      dayOfWeek: slot.dayOfWeek,
      timeSlot: slot.timeSlot,
      contentPillar: slot.contentPillar || null,
    }))
  );
}

/**
 * Format cadence slots into a human-readable string for AI prompts.
 */
export function formatCadenceForPrompt(slots: CadenceSlot[]): string {
  const byDay = new Map<number, CadenceSlot[]>();
  for (const slot of slots) {
    const existing = byDay.get(slot.dayOfWeek) || [];
    existing.push(slot);
    byDay.set(slot.dayOfWeek, existing);
  }

  const lines: string[] = [];
  // Order: Mon-Sun
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  for (const day of dayOrder) {
    const daySlots = byDay.get(day);
    if (!daySlots) continue;
    const entries = daySlots
      .map((s) => {
        let entry = `${s.timeSlot} ${s.platform}`;
        if (s.contentPillar) entry += ` [${s.contentPillar}]`;
        return entry;
      })
      .join(", ");
    lines.push(`${DAY_NAMES[day]}: ${entries}`);
  }

  return lines.join("\n");
}
