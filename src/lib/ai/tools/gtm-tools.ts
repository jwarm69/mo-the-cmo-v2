/**
 * GTM Strategy Tools — channel strategy, ICP management, campaign missions, sales enablement.
 *
 * These tools let Mo read/write the persistent GTM state layer:
 * channels, customer profiles, positioning, campaign milestones, and sales assets.
 */

import { z } from "zod";
import { zodSchema, type Tool } from "ai";
import { db } from "@/lib/db/client";
import {
  gtmChannels,
  channelExperiments,
  customerProfiles,
  positioningFrameworks,
  campaigns,
  contentItems,
} from "@/lib/db/schema";
import { and, eq, ne, desc, sql } from "drizzle-orm";

export function createGtmTools(orgId: string): Record<string, Tool> {
  return {
    // ─── Phase 1: Channel Strategy ─────────────────────────────────

    assess_channel_fit: {
      description:
        "Evaluate whether a marketing channel is a good fit for this business. Returns current channel data if it exists, or signals it's a new channel to evaluate.",
      inputSchema: zodSchema(
        z.object({
          channel: z.string().describe("Channel name, e.g. 'tiktok', 'local-event', 'referral-program'"),
          channelCategory: z.string().describe("Category: digital, physical, guerrilla, partnership, activation, creative, direct"),
        })
      ),
      execute: async ({ channel, channelCategory }: {
        channel: string;
        channelCategory: string;
      }) => {
        const [existing] = await db
          .select()
          .from(gtmChannels)
          .where(and(eq(gtmChannels.orgId, orgId), eq(gtmChannels.channel, channel)))
          .limit(1);

        if (existing) {
          const experiments = await db
            .select({
              hypothesis: channelExperiments.hypothesis,
              action: channelExperiments.action,
              result: channelExperiments.result,
              verdict: channelExperiments.verdict,
            })
            .from(channelExperiments)
            .where(eq(channelExperiments.channelId, existing.id))
            .orderBy(desc(channelExperiments.createdAt))
            .limit(5);

          return {
            exists: true,
            channel: existing.channel,
            category: existing.channelCategory,
            status: existing.status,
            priority: existing.priority,
            rationale: existing.rationale,
            notes: existing.notes,
            experiments,
            message: `Channel "${channel}" is currently ${existing.status} (priority ${existing.priority})`,
          };
        }

        return {
          exists: false,
          channel,
          category: channelCategory,
          message: `Channel "${channel}" is not yet tracked. Use update_channel_status to add it.`,
        };
      },
    },

    update_channel_status: {
      description:
        "Set a channel's status, priority, and rationale. Creates the channel if it doesn't exist (upsert).",
      inputSchema: zodSchema(
        z.object({
          channel: z.string().describe("Channel name"),
          channelCategory: z.string().describe("Category: digital, physical, guerrilla, partnership, activation, creative, direct"),
          status: z.enum(["exploring", "planned", "active", "paused", "killed"]).describe("New status"),
          priority: z.number().min(1).max(5).optional().describe("Priority 1 (highest) to 5 (lowest)"),
          rationale: z.string().describe("Why this status/priority — critical for future context"),
          notes: z.string().optional().describe("Additional notes"),
        })
      ),
      execute: async ({ channel, channelCategory, status, priority, rationale, notes }: {
        channel: string;
        channelCategory: string;
        status: "exploring" | "planned" | "active" | "paused" | "killed";
        priority?: number;
        rationale: string;
        notes?: string;
      }) => {
        const now = new Date();
        const values = {
          orgId,
          channel,
          channelCategory,
          status,
          priority: priority ?? 3,
          rationale,
          notes: notes ?? null,
          startedAt: status === "active" ? now : undefined,
          pausedAt: status === "paused" ? now : undefined,
          updatedAt: now,
        };

        const [upserted] = await db
          .insert(gtmChannels)
          .values({ ...values, createdAt: now })
          .onConflictDoUpdate({
            target: [gtmChannels.orgId, gtmChannels.channel],
            set: values,
          })
          .returning({ id: gtmChannels.id, channel: gtmChannels.channel, status: gtmChannels.status });

        return {
          success: true,
          channelId: upserted.id,
          message: `Channel "${channel}" set to ${status} (priority ${priority ?? 3}): ${rationale}`,
        };
      },
    },

    log_channel_experiment: {
      description:
        "Record a channel experiment — what was hypothesized, what was tried, and what happened.",
      inputSchema: zodSchema(
        z.object({
          channel: z.string().describe("Channel name this experiment is for"),
          hypothesis: z.string().describe("What we expected to happen"),
          action: z.string().describe("What we actually did"),
          result: z.string().optional().describe("What happened (leave empty if ongoing)"),
          verdict: z.enum(["success", "partial", "failure", "inconclusive"]).optional().describe("Outcome verdict"),
        })
      ),
      execute: async ({ channel, hypothesis, action, result, verdict }: {
        channel: string;
        hypothesis: string;
        action: string;
        result?: string;
        verdict?: "success" | "partial" | "failure" | "inconclusive";
      }) => {
        // Find the channel
        const [channelRow] = await db
          .select({ id: gtmChannels.id })
          .from(gtmChannels)
          .where(and(eq(gtmChannels.orgId, orgId), eq(gtmChannels.channel, channel)))
          .limit(1);

        if (!channelRow) {
          return { success: false, message: `Channel "${channel}" not found. Use update_channel_status first.` };
        }

        const [created] = await db
          .insert(channelExperiments)
          .values({
            channelId: channelRow.id,
            orgId,
            hypothesis,
            action,
            result: result ?? null,
            verdict: verdict ?? null,
          })
          .returning({ id: channelExperiments.id });

        return {
          success: true,
          experimentId: created.id,
          message: `Logged experiment for "${channel}": ${hypothesis.slice(0, 60)}...`,
        };
      },
    },

    get_channel_overview: {
      description:
        "Get all tracked channels with their status, priority, and recent experiments.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const channels = await db
          .select()
          .from(gtmChannels)
          .where(and(eq(gtmChannels.orgId, orgId), ne(gtmChannels.status, "killed")))
          .orderBy(gtmChannels.priority);

        if (channels.length === 0) {
          return { channels: [], message: "No channels tracked yet." };
        }

        const channelData = await Promise.all(
          channels.map(async (ch) => {
            const experiments = await db
              .select({
                hypothesis: channelExperiments.hypothesis,
                verdict: channelExperiments.verdict,
                createdAt: channelExperiments.createdAt,
              })
              .from(channelExperiments)
              .where(eq(channelExperiments.channelId, ch.id))
              .orderBy(desc(channelExperiments.createdAt))
              .limit(3);

            return {
              channel: ch.channel,
              category: ch.channelCategory,
              status: ch.status,
              priority: ch.priority,
              rationale: ch.rationale,
              notes: ch.notes,
              recentExperiments: experiments.length,
              lastExperimentVerdict: experiments[0]?.verdict ?? null,
            };
          })
        );

        return {
          channels: channelData,
          activeCount: channelData.filter((c) => c.status === "active").length,
          totalCount: channelData.length,
          message: `${channelData.length} channels tracked (${channelData.filter((c) => c.status === "active").length} active)`,
        };
      },
    },

    // ─── Phase 2: ICP & Positioning ────────────────────────────────

    create_icp: {
      description:
        "Create a new Ideal Customer Profile (ICP). Use this when the user describes a customer segment.",
      inputSchema: zodSchema(
        z.object({
          name: z.string().describe("Profile name, e.g. 'Time-Starved Professional Mom'"),
          isPrimary: z.boolean().optional().describe("Whether this is the primary ICP"),
          demographics: z.object({
            age: z.string().optional(),
            gender: z.string().optional(),
            location: z.string().optional(),
            income: z.string().optional(),
            occupation: z.string().optional(),
          }).optional().describe("Demographic details"),
          psychographics: z.object({
            values: z.array(z.string()).optional(),
            interests: z.array(z.string()).optional(),
            lifestyle: z.string().optional(),
          }).optional().describe("Psychographic details"),
          painPoints: z.array(z.string()).optional().describe("Key pain points"),
          goals: z.array(z.string()).optional().describe("Goals and aspirations"),
          objections: z.array(z.string()).optional().describe("Common objections to buying"),
          buyingTriggers: z.array(z.string()).optional().describe("What triggers a purchase"),
          preferredChannels: z.array(z.string()).optional().describe("Where they hang out"),
          messagingAngle: z.string().optional().describe("Best messaging angle for this ICP"),
          evidence: z.string().optional().describe("How we know this — data, interviews, intuition"),
        })
      ),
      execute: async (input: {
        name: string;
        isPrimary?: boolean;
        demographics?: Record<string, string | undefined>;
        psychographics?: Record<string, unknown>;
        painPoints?: string[];
        goals?: string[];
        objections?: string[];
        buyingTriggers?: string[];
        preferredChannels?: string[];
        messagingAngle?: string;
        evidence?: string;
      }) => {
        const [created] = await db
          .insert(customerProfiles)
          .values({
            orgId,
            name: input.name,
            isPrimary: input.isPrimary ?? false,
            status: "active",
            demographics: input.demographics ?? null,
            psychographics: input.psychographics ?? null,
            painPoints: input.painPoints ?? null,
            goals: input.goals ?? null,
            objections: input.objections ?? null,
            buyingTriggers: input.buyingTriggers ?? null,
            preferredChannels: input.preferredChannels ?? null,
            messagingAngle: input.messagingAngle ?? null,
            evidence: input.evidence ?? null,
          })
          .returning({ id: customerProfiles.id, name: customerProfiles.name });

        return {
          success: true,
          icpId: created.id,
          message: `Created ICP "${input.name}"${input.isPrimary ? " (primary)" : ""}`,
        };
      },
    },

    update_icp: {
      description:
        "Update an existing ICP with new information. Use when the user refines their understanding of a customer segment.",
      inputSchema: zodSchema(
        z.object({
          icpId: z.string().describe("The ICP ID to update"),
          updates: z.object({
            name: z.string().optional(),
            isPrimary: z.boolean().optional(),
            status: z.enum(["draft", "active", "retired"]).optional(),
            painPoints: z.array(z.string()).optional(),
            goals: z.array(z.string()).optional(),
            objections: z.array(z.string()).optional(),
            buyingTriggers: z.array(z.string()).optional(),
            preferredChannels: z.array(z.string()).optional(),
            messagingAngle: z.string().optional(),
            evidence: z.string().optional(),
          }).describe("Fields to update"),
        })
      ),
      execute: async ({ icpId, updates }: {
        icpId: string;
        updates: Record<string, unknown>;
      }) => {
        const [updated] = await db
          .update(customerProfiles)
          .set({ ...updates, updatedAt: new Date() })
          .where(and(eq(customerProfiles.id, icpId), eq(customerProfiles.orgId, orgId)))
          .returning({ id: customerProfiles.id, name: customerProfiles.name });

        if (!updated) return { success: false, message: "ICP not found" };

        return {
          success: true,
          message: `Updated ICP "${updated.name}"`,
        };
      },
    },

    create_positioning: {
      description:
        "Create a positioning framework — value proposition, positioning statement, messaging framework, or competitive positioning.",
      inputSchema: zodSchema(
        z.object({
          type: z.enum(["value_prop", "positioning_statement", "messaging_framework", "competitive_positioning"]).describe("Framework type"),
          title: z.string().describe("Framework title"),
          content: z.record(z.string(), z.unknown()).describe("Framework content (flexible structure per type)"),
          productId: z.string().optional().describe("Associated product ID"),
          icpId: z.string().optional().describe("Associated ICP ID"),
        })
      ),
      execute: async ({ type, title, content, productId, icpId }: {
        type: "value_prop" | "positioning_statement" | "messaging_framework" | "competitive_positioning";
        title: string;
        content: Record<string, unknown>;
        productId?: string;
        icpId?: string;
      }) => {
        const [created] = await db
          .insert(positioningFrameworks)
          .values({
            orgId,
            type,
            title,
            content,
            productId: productId ?? null,
            icpId: icpId ?? null,
            isActive: true,
          })
          .returning({ id: positioningFrameworks.id });

        return {
          success: true,
          frameworkId: created.id,
          message: `Created ${type.replace(/_/g, " ")} "${title}"`,
        };
      },
    },

    get_icps: {
      description:
        "Get all Ideal Customer Profiles for this organization.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        const icps = await db
          .select()
          .from(customerProfiles)
          .where(and(eq(customerProfiles.orgId, orgId), ne(customerProfiles.status, "retired")))
          .orderBy(desc(customerProfiles.isPrimary), customerProfiles.name);

        return {
          icps: icps.map((p) => ({
            id: p.id,
            name: p.name,
            isPrimary: p.isPrimary,
            status: p.status,
            painPoints: p.painPoints,
            goals: p.goals,
            preferredChannels: p.preferredChannels,
            messagingAngle: p.messagingAngle,
          })),
          count: icps.length,
          message: icps.length > 0
            ? `${icps.length} ICPs defined (${icps.filter((p) => p.isPrimary).length} primary)`
            : "No ICPs defined yet.",
        };
      },
    },

    // ─── Phase 3: Campaign Missions + Sales Enablement ─────────────

    update_campaign_milestone: {
      description:
        "Update the status of a campaign milestone (mark as completed or overdue).",
      inputSchema: zodSchema(
        z.object({
          campaignId: z.string().describe("Campaign ID"),
          milestoneTitle: z.string().describe("Title of the milestone to update"),
          status: z.enum(["pending", "completed", "overdue"]).describe("New status"),
        })
      ),
      execute: async ({ campaignId, milestoneTitle, status }: {
        campaignId: string;
        milestoneTitle: string;
        status: "pending" | "completed" | "overdue";
      }) => {
        const [campaign] = await db
          .select({ milestones: campaigns.milestones, name: campaigns.name })
          .from(campaigns)
          .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, orgId)))
          .limit(1);

        if (!campaign) return { success: false, message: "Campaign not found" };

        const rawMilestones = (campaign.milestones ?? []) as Array<{
          title: string;
          dueDate: string;
          status: string;
          completedAt?: string;
        }>;

        const idx = rawMilestones.findIndex((m) => m.title === milestoneTitle);
        if (idx === -1) return { success: false, message: `Milestone "${milestoneTitle}" not found` };

        rawMilestones[idx].status = status;
        if (status === "completed") rawMilestones[idx].completedAt = new Date().toISOString();

        // Recalculate completion percent
        const completed = rawMilestones.filter((m) => m.status === "completed").length;
        const completionPercent = rawMilestones.length > 0 ? Math.round((completed / rawMilestones.length) * 100) : 0;

        // Cast to the schema-expected type
        const typedMilestones = rawMilestones as typeof campaigns.$inferSelect["milestones"];

        await db
          .update(campaigns)
          .set({ milestones: typedMilestones, completionPercent, updatedAt: new Date() })
          .where(eq(campaigns.id, campaignId));

        return {
          success: true,
          message: `Milestone "${milestoneTitle}" marked as ${status}. Campaign "${campaign.name}" is ${completionPercent}% complete.`,
        };
      },
    },

    create_sales_asset: {
      description:
        "Create a sales enablement asset (battle card, outbound sequence, objection handler, one-pager, case study, pitch deck outline).",
      inputSchema: zodSchema(
        z.object({
          contentType: z.enum([
            "battle_card",
            "outbound_sequence",
            "objection_handler",
            "pitch_deck_outline",
            "one_pager",
            "case_study",
          ]).describe("Type of sales asset"),
          title: z.string().describe("Asset title"),
          body: z.string().describe("The full content of the asset"),
          campaignId: z.string().optional().describe("Associated campaign ID"),
        })
      ),
      execute: async ({ contentType, title, body, campaignId }: {
        contentType: string;
        title: string;
        body: string;
        campaignId?: string;
      }) => {
        const [created] = await db
          .insert(contentItems)
          .values({
            orgId,
            platform: "blog", // Sales assets use blog as platform placeholder
            contentType,
            status: "draft",
            title,
            body,
            campaignId: campaignId ?? null,
          })
          .returning({ id: contentItems.id });

        return {
          success: true,
          assetId: created.id,
          message: `Created ${contentType.replace(/_/g, " ")}: "${title}"`,
        };
      },
    },

    get_campaign_status: {
      description:
        "Get detailed campaign status including milestones, deliverables, and completion progress.",
      inputSchema: zodSchema(
        z.object({
          campaignId: z.string().describe("Campaign ID to check"),
        })
      ),
      execute: async ({ campaignId }: { campaignId: string }) => {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, orgId)))
          .limit(1);

        if (!campaign) return { success: false, message: "Campaign not found" };

        const milestones = (campaign.milestones ?? []) as Array<{
          title: string;
          dueDate: string;
          status: string;
        }>;
        const deliverables = (campaign.deliverables ?? []) as Array<{
          title: string;
          type: string;
          status: string;
        }>;

        const overdue = milestones.filter(
          (m) => m.status === "pending" && new Date(m.dueDate) < new Date()
        );

        return {
          name: campaign.name,
          status: campaign.status,
          completionPercent: campaign.completionPercent ?? 0,
          milestones: {
            total: milestones.length,
            completed: milestones.filter((m) => m.status === "completed").length,
            overdue: overdue.length,
            items: milestones,
          },
          deliverables: {
            total: deliverables.length,
            done: deliverables.filter((d) => d.status === "done").length,
            items: deliverables,
          },
          successCriteria: campaign.successCriteria,
          message: `Campaign "${campaign.name}": ${campaign.completionPercent ?? 0}% complete, ${overdue.length} overdue milestones`,
        };
      },
    },
  };
}
