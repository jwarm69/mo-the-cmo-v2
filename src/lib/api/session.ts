import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userProfiles } from "@/lib/db/schema";

export interface SessionUser {
  id: string;
  email: string;
  orgId: string | null;
  usageLimitCents: number;
  isApiKeyUser: boolean;
}

async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Read-only in Server Components
          }
        },
      },
    }
  );
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  const profile = profiles[0];
  if (!profile) {
    // Profile not yet created by trigger — return basic info
    return {
      id: user.id,
      email: user.email ?? "",
      orgId: null,
      usageLimitCents: 50,
      isApiKeyUser: false,
    };
  }

  return {
    id: profile.id,
    email: profile.email,
    orgId: profile.orgId,
    usageLimitCents: profile.usageLimitCents,
    isApiKeyUser: false,
  };
}

function extractApiKey(req: Request): string | null {
  const explicitKey = req.headers.get("x-api-key");
  if (explicitKey) return explicitKey;

  const authorization = req.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

/**
 * Authenticate a request. Tries Supabase session first, then falls back
 * to legacy API key auth (which returns a synthetic system user with no
 * usage limit).
 */
export async function requireAuth(
  req: Request
): Promise<{ user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse }> {
  // 1. Try Supabase session (cookie-based)
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser) {
      return { user: sessionUser };
    }
  } catch {
    // Cookies may not be available in some contexts — fall through
  }

  // 2. Fallback: legacy API key auth
  const expectedApiKey = process.env.APP_API_KEY;
  if (!expectedApiKey) {
    return {
      error: NextResponse.json(
        { error: "Server misconfiguration: APP_API_KEY is missing." },
        { status: 500 }
      ),
    };
  }

  const providedKey = extractApiKey(req);
  if (providedKey && providedKey === expectedApiKey) {
    return {
      user: {
        id: "system",
        email: "api-key@system",
        orgId: null,
        usageLimitCents: 0, // 0 = no limit for API key users
        isApiKeyUser: true,
      },
    };
  }

  return {
    error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
