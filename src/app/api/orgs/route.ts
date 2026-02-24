import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  orgMemberships,
  organizations,
  brandProfiles,
  userProfiles,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/api/session";

export const runtime = "nodejs";

/** GET /api/orgs — list all orgs the user belongs to */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const rows = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      role: orgMemberships.role,
      brandName: brandProfiles.name,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .leftJoin(brandProfiles, eq(brandProfiles.orgId, organizations.id))
    .where(eq(orgMemberships.userId, user.id));

  return NextResponse.json({
    activeOrgId: user.orgId,
    orgs: rows.map((r) => ({
      id: r.orgId,
      name: r.brandName ?? r.orgName,
      slug: r.orgSlug,
      role: r.role,
      isActive: r.orgId === user.orgId,
    })),
  });
}

/** POST /api/orgs — switch active org */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = (await req.json()) as { orgId?: string };
  if (!body.orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  // Verify membership
  const [membership] = await db
    .select()
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, user.id),
        eq(orgMemberships.orgId, body.orgId)
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this organization" },
      { status: 403 }
    );
  }

  // Update active org
  await db
    .update(userProfiles)
    .set({ orgId: body.orgId, updatedAt: new Date() })
    .where(eq(userProfiles.id, user.id));

  return NextResponse.json({ activeOrgId: body.orgId });
}
