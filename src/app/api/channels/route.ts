import { NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { gtmChannels, channelExperiments } from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const channels = await db
    .select()
    .from(gtmChannels)
    .where(eq(gtmChannels.orgId, org.id))
    .orderBy(gtmChannels.priority);

  // Get experiment counts per channel
  const channelsWithExperiments = await Promise.all(
    channels.map(async (ch) => {
      const experiments = await db
        .select()
        .from(channelExperiments)
        .where(eq(channelExperiments.channelId, ch.id))
        .orderBy(desc(channelExperiments.createdAt))
        .limit(5);

      return { ...ch, experiments };
    })
  );

  return NextResponse.json(channelsWithExperiments);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const { channel, channelCategory, status, priority, rationale, notes } = body as {
    channel?: string;
    channelCategory?: string;
    status?: string;
    priority?: number;
    rationale?: string;
    notes?: string;
  };

  if (!channel?.trim() || !channelCategory?.trim()) {
    return NextResponse.json(
      { error: "channel and channelCategory are required" },
      { status: 400 }
    );
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(gtmChannels)
    .values({
      orgId: org.id,
      channel: channel.trim(),
      channelCategory: channelCategory.trim(),
      status: (status as "exploring" | "planned" | "active" | "paused" | "killed") || "exploring",
      priority: priority ?? 3,
      rationale: rationale || null,
      notes: notes || null,
      startedAt: status === "active" ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [gtmChannels.orgId, gtmChannels.channel],
      set: {
        channelCategory: channelCategory.trim(),
        status: (status as "exploring" | "planned" | "active" | "paused" | "killed") || "exploring",
        priority: priority ?? 3,
        rationale: rationale || null,
        notes: notes || null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
