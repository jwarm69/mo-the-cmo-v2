import { NextResponse } from "next/server";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { contentItems, campaigns, brandProfiles } from "@/lib/db/schema";
import { normalizeBrandProfile } from "@/lib/brand/defaults";

interface Suggestion {
  id: string;
  type: "gap" | "imbalance" | "stale" | "campaign";
  title: string;
  description: string;
  action: { label: string; href: string };
}

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const suggestions: Suggestion[] = [];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [platformActivity, brandRecord, activeCampaigns, recentContentCount] =
    await Promise.all([
      // Content per platform in last week
      db
        .select({
          platform: contentItems.platform,
          count: count(),
        })
        .from(contentItems)
        .where(
          and(
            eq(contentItems.orgId, org.id),
            gte(contentItems.createdAt, oneWeekAgo)
          )
        )
        .groupBy(contentItems.platform),

      // Brand profile for pillar targets
      db
        .select({
          contentPillars: brandProfiles.contentPillars,
        })
        .from(brandProfiles)
        .where(eq(brandProfiles.orgId, org.id))
        .limit(1),

      // Active campaigns
      db
        .select({ id: campaigns.id, name: campaigns.name, endDate: campaigns.endDate })
        .from(campaigns)
        .where(and(eq(campaigns.orgId, org.id), eq(campaigns.status, "active"))),

      // Total recent content
      db
        .select({ value: count() })
        .from(contentItems)
        .where(
          and(
            eq(contentItems.orgId, org.id),
            gte(contentItems.createdAt, threeDaysAgo)
          )
        ),
    ]);

  // Check for platform gaps
  const activePlatforms = new Set(platformActivity.map((p) => p.platform));
  const allPlatforms = ["tiktok", "instagram", "twitter", "facebook", "linkedin"] as const;
  for (const platform of allPlatforms) {
    if (!activePlatforms.has(platform)) {
      suggestions.push({
        id: `gap-${platform}`,
        type: "gap",
        title: `No ${platform} content this week`,
        description: `You haven't created any ${platform} content in the past 7 days. Stay visible to your audience.`,
        action: { label: "Create Content", href: "/content" },
      });
    }
  }

  // Check for pillar imbalance
  if (brandRecord[0]) {
    const brand = normalizeBrandProfile({
      contentPillars: brandRecord[0].contentPillars ?? undefined,
    });

    // Get all content for pillar distribution
    const allContent = await db
      .select({ metadata: contentItems.metadata })
      .from(contentItems)
      .where(eq(contentItems.orgId, org.id));

    if (allContent.length >= 5) {
      const pillarCounts: Record<string, number> = {};
      for (const row of allContent) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const pillar = (meta.pillar as string) || "General";
        pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1;
      }

      const total = Object.values(pillarCounts).reduce((a, b) => a + b, 0);
      for (const target of brand.contentPillars) {
        const actual = ((pillarCounts[target.name] || 0) / total) * 100;
        const diff = target.ratio - actual;
        if (diff > 15) {
          suggestions.push({
            id: `imbalance-${target.name}`,
            type: "imbalance",
            title: `${target.name} pillar is underweight`,
            description: `Target: ${target.ratio}%, Actual: ${Math.round(actual)}%. Create more ${target.name} content to rebalance.`,
            action: { label: "Chat with Mo", href: "/chat" },
          });
          break; // Only show one imbalance suggestion
        }
      }
    }
  }

  // Check for stale content
  const recentCount = recentContentCount[0]?.value ?? 0;
  if (recentCount === 0) {
    suggestions.push({
      id: "stale",
      type: "stale",
      title: "No content in 3 days",
      description: "Keep your momentum going. Generate a batch of content or capture some ideas.",
      action: { label: "Generate Content", href: "/content" },
    });
  }

  // Check for upcoming campaign deadlines
  const now = new Date();
  for (const campaign of activeCampaigns) {
    if (campaign.endDate) {
      const daysUntilEnd = Math.ceil(
        (new Date(campaign.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilEnd > 0 && daysUntilEnd <= 7) {
        suggestions.push({
          id: `campaign-${campaign.id}`,
          type: "campaign",
          title: `"${campaign.name}" ends in ${daysUntilEnd} day${daysUntilEnd === 1 ? "" : "s"}`,
          description: "Make sure you have enough content queued for the final push.",
          action: { label: "View Campaign", href: "/campaigns" },
        });
      }
    }
  }

  return NextResponse.json(suggestions.slice(0, 3));
}
