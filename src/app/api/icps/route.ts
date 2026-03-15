import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { customerProfiles } from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const icps = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.orgId, org.id))
    .orderBy(desc(customerProfiles.isPrimary), customerProfiles.name);

  return NextResponse.json(icps);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const { name, isPrimary, demographics, psychographics, painPoints, goals, objections, buyingTriggers, preferredChannels, messagingAngle, evidence } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(customerProfiles)
    .values({
      orgId: org.id,
      name: name.trim(),
      isPrimary: isPrimary ?? false,
      status: "active",
      demographics: demographics ?? null,
      psychographics: psychographics ?? null,
      painPoints: painPoints ?? null,
      goals: goals ?? null,
      objections: objections ?? null,
      buyingTriggers: buyingTriggers ?? null,
      preferredChannels: preferredChannels ?? null,
      messagingAngle: messagingAngle ?? null,
      evidence: evidence ?? null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
