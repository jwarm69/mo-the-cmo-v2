import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { campaigns } from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.orgId, org.id))
    .orderBy(desc(campaigns.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const { name, description, objective, platforms, startDate, endDate, budget } = body as {
    name?: string;
    description?: string;
    objective?: string;
    platforms?: string[];
    startDate?: string;
    endDate?: string;
    budget?: number;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(campaigns)
    .values({
      orgId: org.id,
      name: name.trim(),
      description: description || null,
      objective: objective || null,
      platforms: platforms || [],
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ?? null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
