import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { calendarSlots } from "@/lib/db/schema";
import type { Platform } from "@/lib/types";

export interface CadenceSlot {
  platform: Platform;
  dayOfWeek: number; // 0=Sun, 6=Sat
  timeSlot: string; // HH:MM
  contentPillar?: string | null;
}

export const DEFAULT_CADENCE: CadenceSlot[] = [
  { platform: "tiktok", dayOfWeek: 1, timeSlot: "12:00" },
  { platform: "instagram", dayOfWeek: 1, timeSlot: "18:00" },
  { platform: "tiktok", dayOfWeek: 2, timeSlot: "12:00" },
  { platform: "twitter", dayOfWeek: 2, timeSlot: "17:00" },
  { platform: "tiktok", dayOfWeek: 3, timeSlot: "12:00" },
  { platform: "instagram", dayOfWeek: 3, timeSlot: "18:00" },
  { platform: "tiktok", dayOfWeek: 4, timeSlot: "12:00" },
  { platform: "twitter", dayOfWeek: 4, timeSlot: "17:00" },
  { platform: "tiktok", dayOfWeek: 5, timeSlot: "12:00" },
  { platform: "instagram", dayOfWeek: 5, timeSlot: "18:00" },
  { platform: "tiktok", dayOfWeek: 6, timeSlot: "11:00" },
  { platform: "instagram", dayOfWeek: 6, timeSlot: "15:00" },
  { platform: "tiktok", dayOfWeek: 0, timeSlot: "14:00" },
  { platform: "instagram", dayOfWeek: 0, timeSlot: "18:00" },
];

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

  if (!rows.length) return DEFAULT_CADENCE;

  return rows.map((row) => ({
    platform: row.platform as Platform,
    dayOfWeek: row.dayOfWeek,
    timeSlot: row.timeSlot,
    contentPillar: row.contentPillar,
  }));
}
