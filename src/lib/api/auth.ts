import { NextResponse } from "next/server";

function extractApiKey(req: Request): string | null {
  const explicitKey = req.headers.get("x-api-key");
  if (explicitKey) return explicitKey;

  const authorization = req.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

export function requireApiKey(req: Request): NextResponse | null {
  const expectedApiKey = process.env.APP_API_KEY;

  if (!expectedApiKey) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: APP_API_KEY is missing. Add APP_API_KEY and NEXT_PUBLIC_APP_API_KEY to your env.",
      },
      { status: 500 }
    );
  }

  const providedApiKey = extractApiKey(req);
  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
