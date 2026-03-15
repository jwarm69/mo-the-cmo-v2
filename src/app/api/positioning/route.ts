import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { positioningFrameworks } from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const frameworks = await db
    .select()
    .from(positioningFrameworks)
    .where(eq(positioningFrameworks.orgId, org.id))
    .orderBy(desc(positioningFrameworks.updatedAt));

  return NextResponse.json(frameworks);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const { type, title, content, productId, icpId } = body;

  if (!type || !title?.trim() || !content) {
    return NextResponse.json({ error: "type, title, and content are required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(positioningFrameworks)
    .values({
      orgId: org.id,
      type,
      title: title.trim(),
      content,
      productId: productId ?? null,
      icpId: icpId ?? null,
      isActive: true,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
