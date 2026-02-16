import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { brandProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json(
      { error: "orgId is required" },
      { status: 400 }
    );
  }

  const profiles = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.orgId, orgId));

  return NextResponse.json(profiles[0] || null);
}

export async function POST(req: Request) {
  const body = await req.json();

  const [profile] = await db
    .insert(brandProfiles)
    .values(body)
    .returning();

  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, ...data } = body;

  const [updated] = await db
    .update(brandProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(brandProfiles.id, id))
    .returning();

  return NextResponse.json(updated);
}
