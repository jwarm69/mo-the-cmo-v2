import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { generateGtmBriefing } from "@/lib/gtm/briefing-engine";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  try {
    const briefing = await generateGtmBriefing(org.id);
    return NextResponse.json(briefing);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate briefing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
