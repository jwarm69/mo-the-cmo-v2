import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/session";
import { checkUsageLimit } from "@/lib/usage/tracker";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  if (user.isApiKeyUser) {
    return NextResponse.json({
      spentCents: 0,
      limitCents: 0,
      remainingCents: 0,
      unlimited: true,
    });
  }

  const usage = await checkUsageLimit(user.id, user.usageLimitCents);

  return NextResponse.json({
    spentCents: usage.spentCents,
    limitCents: usage.limitCents,
    remainingCents: usage.remainingCents,
  });
}
