import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";

export interface ResolvedOrg {
  id: string;
  slug: string;
  name: string;
}

type JsonRecord = Record<string, unknown>;

function asJsonRecord(value: unknown): JsonRecord {
  if (typeof value === "object" && value !== null) {
    return value as JsonRecord;
  }

  return {};
}

function readString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSlug(rawSlug: string): string {
  const normalized = rawSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "default-org";
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Resolve the organization from the request. Priority:
 * 1. userOrgId (from authenticated user profile)
 * 2. orgSlug in request body
 * 3. x-org-slug header
 * 4. orgSlug query parameter
 * 5. DEFAULT_ORG_SLUG env var
 * 6. Fallback: "default-org"
 */
export async function resolveOrgFromRequest(
  req: Request,
  body?: unknown,
  userOrgId?: string | null
): Promise<ResolvedOrg> {
  // If the authenticated user has an org assigned, use it first
  if (userOrgId) {
    const existing = await db
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, userOrgId))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }
  }

  const url = new URL(req.url);
  const bodyRecord = asJsonRecord(body);

  const rawSlug =
    readString(bodyRecord, "orgSlug") ??
    req.headers.get("x-org-slug") ??
    url.searchParams.get("orgSlug") ??
    process.env.DEFAULT_ORG_SLUG ??
    process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG ??
    "default-org";

  const slug = normalizeSlug(rawSlug);

  const name =
    readString(bodyRecord, "orgName") ??
    req.headers.get("x-org-name") ??
    url.searchParams.get("orgName") ??
    process.env.DEFAULT_ORG_NAME ??
    process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME ??
    slugToName(slug);

  const existing = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const [created] = await db
    .insert(organizations)
    .values({ slug, name })
    .returning({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
    });

  return created;
}
