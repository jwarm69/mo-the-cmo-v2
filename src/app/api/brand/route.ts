import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { brandProfiles, userProfiles } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import {
  DEFAULT_BRAND_PROFILE,
  normalizeBrandProfile,
  type BrandProfileInput,
} from "@/lib/brand/defaults";

export const runtime = "nodejs";

type BrandPayload = Partial<BrandProfileInput> & {
  orgSlug?: string;
  orgName?: string;
};

function sanitizeBrandPayload(payload: BrandPayload): BrandProfileInput {
  return normalizeBrandProfile({
    name: payload.name,
    voice: payload.voice,
    tone: payload.tone,
    messagingPillars: payload.messagingPillars,
    contentPillars: payload.contentPillars,
    targetAudience: payload.targetAudience,
    brandGuidelines: payload.brandGuidelines,
    competitors: payload.competitors,
    hashtags: payload.hashtags,
  });
}

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const org = await resolveOrgFromRequest(req, undefined, user.orgId);

    const profiles = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.orgId, org.id))
      .limit(1);

    return NextResponse.json({
      org,
      profile: profiles[0] ?? {
        ...DEFAULT_BRAND_PROFILE,
        name: org.name,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load brand profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const body = (await req.json()) as BrandPayload;
    const org = await resolveOrgFromRequest(req, body, user.orgId);
    const profileData = sanitizeBrandPayload(body);

    const [profile] = await db
      .insert(brandProfiles)
      .values({
        orgId: org.id,
        ...profileData,
      })
      .onConflictDoUpdate({
        target: brandProfiles.orgId,
        set: {
          ...profileData,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Auto-link user to org if they don't have one yet (e.g. first-time setup)
    if (!user.orgId && !user.isApiKeyUser) {
      await db
        .update(userProfiles)
        .set({ orgId: org.id, updatedAt: new Date() })
        .where(eq(userProfiles.id, user.id));
    }

    return NextResponse.json({ org, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save brand profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
