import { NextResponse } from "next/server";
import { generateText } from "ai";
import { gpt4oMini } from "@/lib/ai/providers/openai";
import { buildContentGenerationPrompt } from "@/lib/ai/prompts/system";
import { assembleContext } from "@/lib/rag/context";
import { requireApiKey } from "@/lib/api/auth";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { contentItems, calendarSlots } from "@/lib/store";
import type { ContentItem, CalendarSlot, Platform } from "@/lib/store/types";
import { BITE_CLUB_BRAND_SEED } from "@/lib/seed/bite-club";

const WEEKLY_SCHEDULE: { day: number; time: string; platform: Platform }[] = [
  { day: 1, time: "12:00", platform: "tiktok" },
  { day: 1, time: "18:00", platform: "instagram" },
  { day: 2, time: "12:00", platform: "tiktok" },
  { day: 2, time: "17:00", platform: "twitter" },
  { day: 3, time: "12:00", platform: "tiktok" },
  { day: 3, time: "18:00", platform: "instagram" },
  { day: 4, time: "12:00", platform: "tiktok" },
  { day: 4, time: "17:00", platform: "twitter" },
  { day: 5, time: "12:00", platform: "tiktok" },
  { day: 5, time: "18:00", platform: "instagram" },
  { day: 6, time: "11:00", platform: "tiktok" },
  { day: 6, time: "15:00", platform: "instagram" },
  { day: 0, time: "14:00", platform: "tiktok" },
  { day: 0, time: "18:00", platform: "instagram" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TOPICS = [
  "How much you save skipping delivery fees this week",
  "Day in the life: eating on campus with Bite Club",
  "Hidden gem restaurant near UF campus",
  "Study snack haul under $10",
  "DoorDash vs Bite Club receipt comparison",
  "Best lunch spots between classes",
  "How to eat well on a student budget",
  "Campus food hack: order ahead trick",
  "Student testimonial: switching from meal plan",
  "Game day food prep guide",
  "Top 3 late night eats near campus",
  "Weekly savings challenge results",
  "New restaurant partner spotlight",
  "Finals week fuel: best energy meals",
];

export async function POST(req: Request) {
  const authError = requireApiKey(req);
  if (authError) return authError;

  const org = await resolveOrgFromRequest(req);

  const pillars = BITE_CLUB_BRAND_SEED.contentPillars;
  const { brandContext } = await assembleContext(org.id, "weekly content plan");

  // Get the Monday of the current week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const results = await Promise.all(
    WEEKLY_SCHEDULE.map(async (slot, i) => {
      const topic = TOPICS[i % TOPICS.length];
      // Weighted random pillar selection based on ratios
      const rand = Math.random() * 100;
      let cumulative = 0;
      let pillar = pillars[0].name;
      for (const p of pillars) {
        cumulative += p.ratio;
        if (rand <= cumulative) {
          pillar = p.name;
          break;
        }
      }

      const prompt = buildContentGenerationPrompt(
        slot.platform,
        topic,
        pillar,
        brandContext
      );

      const { text } = await generateText({
        model: gpt4oMini,
        prompt,
      });

      let parsed: { hook: string; body: string; cta: string; hashtags: string[]; pillar: string };
      try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { hook: "", body: text, cta: "", hashtags: [], pillar };
      }

      // Calculate the actual date for this slot
      const slotDate = new Date(monday);
      const daysFromMonday = slot.day === 0 ? 6 : slot.day - 1;
      slotDate.setDate(monday.getDate() + daysFromMonday);
      const dateStr = slotDate.toISOString().split("T")[0];

      const item: ContentItem = {
        id: crypto.randomUUID(),
        platform: slot.platform,
        pillar: parsed.pillar || pillar,
        topic,
        hook: parsed.hook,
        body: parsed.body,
        cta: parsed.cta,
        hashtags: parsed.hashtags,
        status: "draft",
        scheduledDate: dateStr,
        scheduledTime: slot.time,
        createdAt: new Date(),
      };
      contentItems.set(item.id, item);

      const calSlot: CalendarSlot = {
        id: crypto.randomUUID(),
        dayOfWeek: slot.day,
        time: slot.time,
        platform: slot.platform,
        contentItemId: item.id,
      };
      calendarSlots.set(calSlot.id, calSlot);

      return {
        ...item,
        dayName: DAY_NAMES[slot.day],
      };
    })
  );

  return NextResponse.json({
    success: true,
    count: results.length,
    items: results,
  });
}
