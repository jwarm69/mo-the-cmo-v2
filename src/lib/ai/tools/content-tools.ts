import { z } from "zod";
import { zodSchema, type Tool } from "ai";
import { insertContent, updateContent } from "@/lib/db/content";
import type { Platform } from "@/lib/types";

export function createContentTools(orgId: string): Record<string, Tool> {
  return {
    create_content: {
      description:
        "Create a new piece of content. Use this when the user asks you to write, draft, or create content for a specific platform.",
      inputSchema: zodSchema(
        z.object({
          platform: z
            .enum(["tiktok", "instagram", "twitter", "email", "blog"])
            .describe("Target platform"),
          topic: z.string().describe("The topic or subject of the content"),
          hook: z.string().describe("The attention-grabbing opener"),
          body: z.string().describe("The main content body"),
          cta: z.string().describe("The call-to-action"),
          hashtags: z.array(z.string()).optional().describe("Relevant hashtags"),
          pillar: z.string().optional().describe("Content pillar this serves"),
        })
      ),
      execute: async ({ platform, topic, hook, body, cta, hashtags, pillar }: {
        platform: string;
        topic: string;
        hook: string;
        body: string;
        cta: string;
        hashtags?: string[];
        pillar?: string;
      }) => {
        const item = await insertContent(orgId, {
          platform: platform as Platform,
          hook,
          body,
          cta,
          hashtags: hashtags || [],
          pillar: pillar || "General",
          topic,
        });
        return {
          success: true,
          contentId: item.id,
          platform: item.platform,
          status: item.status,
          message: `Created ${platform} content: "${hook.slice(0, 60)}..."`,
        };
      },
    },

    schedule_content: {
      description:
        "Schedule a piece of content for publishing at a specific date.",
      inputSchema: zodSchema(
        z.object({
          contentId: z.string().describe("The content item ID to schedule"),
          date: z.string().describe("Date to schedule (YYYY-MM-DD format)"),
          time: z.string().optional().describe("Time to schedule (HH:MM format, defaults to 12:00)"),
        })
      ),
      execute: async ({ contentId, date, time }: { contentId: string; date: string; time?: string }) => {
        const updated = await updateContent(contentId, orgId, {
          status: "scheduled",
          scheduledDate: date,
          scheduledTime: time || "12:00",
        });
        if (!updated) return { success: false, message: "Content not found" };
        return {
          success: true,
          message: `Scheduled for ${date} at ${time || "12:00"}`,
        };
      },
    },
  };
}
