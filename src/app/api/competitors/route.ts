import { NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { competitorProfiles, competitorContent } from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // Fetch profiles with content count via subquery
  const profiles = await db
    .select({
      id: competitorProfiles.id,
      orgId: competitorProfiles.orgId,
      name: competitorProfiles.name,
      urls: competitorProfiles.urls,
      lastScrapedAt: competitorProfiles.lastScrapedAt,
      metadata: competitorProfiles.metadata,
      createdAt: competitorProfiles.createdAt,
      updatedAt: competitorProfiles.updatedAt,
      contentCount: sql<number>`(
        SELECT count(*)::int FROM competitor_content
        WHERE competitor_content.competitor_id = ${competitorProfiles.id}
      )`.as("content_count"),
    })
    .from(competitorProfiles)
    .where(eq(competitorProfiles.orgId, org.id))
    .orderBy(desc(competitorProfiles.updatedAt))
    .limit(limit ?? 100);

  // For each profile that has content, fetch the latest analysis
  const enriched = await Promise.all(
    profiles.map(async (profile) => {
      let latestAnalysis: Record<string, unknown> | null = null;
      if (profile.contentCount > 0) {
        const [latest] = await db
          .select({ analysis: competitorContent.analysis })
          .from(competitorContent)
          .where(
            and(
              eq(competitorContent.competitorId, profile.id),
              sql`${competitorContent.analysis} IS NOT NULL`
            )
          )
          .orderBy(desc(competitorContent.createdAt))
          .limit(1);
        if (latest?.analysis) {
          latestAnalysis = latest.analysis;
        }
      }
      return { ...profile, latestAnalysis };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const { name, urls } = body as { name: string; urls?: string[] };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(competitorProfiles)
    .values({ orgId: org.id, name: name.trim(), urls: urls ?? [] })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const { competitorId } = body as { competitorId: string };

  if (!competitorId) {
    return NextResponse.json(
      { error: "competitorId is required" },
      { status: 400 }
    );
  }

  // Verify the profile belongs to this org
  const [profile] = await db
    .select({ id: competitorProfiles.id })
    .from(competitorProfiles)
    .where(
      and(
        eq(competitorProfiles.id, competitorId),
        eq(competitorProfiles.orgId, org.id)
      )
    )
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascade: delete all competitor content first
  await db
    .delete(competitorContent)
    .where(eq(competitorContent.competitorId, competitorId));

  // Then delete the profile
  await db
    .delete(competitorProfiles)
    .where(eq(competitorProfiles.id, competitorId));

  return NextResponse.json({ success: true });
}
