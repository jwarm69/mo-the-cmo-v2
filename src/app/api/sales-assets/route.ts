import { NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { contentItems } from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const assets = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.orgId, org.id),
        ne(contentItems.contentType, "social_content")
      )
    )
    .orderBy(desc(contentItems.createdAt));

  return NextResponse.json(assets);
}
