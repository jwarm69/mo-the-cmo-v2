import { z } from "zod";
import { zodSchema, type Tool } from "ai";
import { db } from "@/lib/db/client";
import { campaigns, ideas, marketingGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function createPlanningTools(orgId: string): Record<string, Tool> {
  return {
    create_campaign: {
      description:
        "Create a new marketing campaign with a name, objective, and target platforms.",
      inputSchema: zodSchema(
        z.object({
          name: z.string().describe("Campaign name"),
          objective: z.string().describe("Campaign objective"),
          platforms: z
            .array(z.string())
            .describe("Target platforms for this campaign"),
        })
      ),
      execute: async ({ name, objective, platforms }: {
        name: string;
        objective: string;
        platforms: string[];
      }) => {
        const [created] = await db
          .insert(campaigns)
          .values({
            orgId,
            name,
            objective,
            platforms,
            status: "draft",
          })
          .returning({ id: campaigns.id, name: campaigns.name });

        return {
          success: true,
          campaignId: created.id,
          message: `Created campaign "${name}" targeting ${platforms.join(", ")}`,
        };
      },
    },

    log_idea: {
      description:
        "Capture a content or marketing idea for later use.",
      inputSchema: zodSchema(
        z.object({
          text: z.string().describe("The idea text"),
          platform: z
            .enum(["tiktok", "instagram", "twitter", "email", "blog"])
            .optional()
            .describe("Target platform if known"),
          pillar: z.string().optional().describe("Content pillar if applicable"),
        })
      ),
      execute: async ({ text, platform, pillar }: {
        text: string;
        platform?: string;
        pillar?: string;
      }) => {
        const [created] = await db
          .insert(ideas)
          .values({
            orgId,
            text,
            platform: (platform as "tiktok" | "instagram" | "twitter" | "email" | "blog") || null,
            pillar: pillar || null,
            source: "mo_suggestion",
          })
          .returning({ id: ideas.id });

        return {
          success: true,
          ideaId: created.id,
          message: `Captured idea: "${text.slice(0, 80)}..."`,
        };
      },
    },

    update_goal_progress: {
      description:
        "Update the current value/progress of a marketing goal.",
      inputSchema: zodSchema(
        z.object({
          goalId: z.string().describe("The goal ID to update"),
          value: z.number().describe("The new current value"),
        })
      ),
      execute: async ({ goalId, value }: { goalId: string; value: number }) => {
        const [updated] = await db
          .update(marketingGoals)
          .set({ currentValue: value, updatedAt: new Date() })
          .where(eq(marketingGoals.id, goalId))
          .returning({
            id: marketingGoals.id,
            title: marketingGoals.title,
            currentValue: marketingGoals.currentValue,
            targetValue: marketingGoals.targetValue,
          });

        if (!updated) return { success: false, message: "Goal not found" };

        const progress = updated.targetValue
          ? Math.round((value / updated.targetValue) * 100)
          : null;

        return {
          success: true,
          message: `Updated "${updated.title}" to ${value}${progress ? ` (${progress}% of target)` : ""}`,
        };
      },
    },
  };
}
