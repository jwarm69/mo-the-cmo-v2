import { NextResponse } from "next/server";
import { and, desc, eq, sql, ilike } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { contextEntries } from "@/lib/db/schema";
import {
  captureContext,
  captureContextBatch,
  type CaptureInput,
} from "@/lib/brain/context-brain";

/**
 * GET /api/brain/entries
 * List brain entries with optional type filter and search.
 * Query params: type, q, limit, offset
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const url = new URL(req.url);
  const typeFilter = url.searchParams.get("type");
  const search = url.searchParams.get("q");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const conditions = [
    eq(contextEntries.orgId, org.id),
    eq(contextEntries.isActive, true),
  ];

  if (typeFilter) {
    conditions.push(
      sql`${contextEntries.type} = ${typeFilter}`
    );
  }

  if (search) {
    conditions.push(
      ilike(contextEntries.title, `%${search}%`)
    );
  }

  const rows = await db
    .select({
      id: contextEntries.id,
      type: contextEntries.type,
      title: contextEntries.title,
      content: contextEntries.content,
      source: contextEntries.source,
      sourceId: contextEntries.sourceId,
      confidence: contextEntries.confidence,
      metadata: contextEntries.metadata,
      createdAt: contextEntries.createdAt,
      updatedAt: contextEntries.updatedAt,
    })
    .from(contextEntries)
    .where(and(...conditions))
    .orderBy(desc(contextEntries.updatedAt))
    .limit(limit)
    .offset(offset);

  // Also get counts by type for the dashboard
  const typeCounts = await db
    .select({
      type: contextEntries.type,
      count: sql<number>`count(*)::int`,
    })
    .from(contextEntries)
    .where(
      and(eq(contextEntries.orgId, org.id), eq(contextEntries.isActive, true))
    )
    .groupBy(contextEntries.type);

  return NextResponse.json({
    entries: rows,
    counts: Object.fromEntries(typeCounts.map((r) => [r.type, r.count])),
    total: typeCounts.reduce((sum, r) => sum + r.count, 0),
  });
}

/**
 * POST /api/brain/entries
 * Create one or more brain entries.
 * Body: { entries: CaptureInput[] } or single { type, title, content, ... }
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  // Support both single entry and batch
  const rawEntries: Array<{
    type: string;
    title: string;
    content: string;
    source?: string;
    sourceId?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }> = body.entries ?? [body];

  if (rawEntries.length === 0) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  const inputs: CaptureInput[] = rawEntries.map((entry) => ({
    orgId: org.id,
    userId: user.isApiKeyUser ? undefined : user.id,
    type: entry.type as CaptureInput["type"],
    title: entry.title,
    content: entry.content,
    source: entry.source ?? "brain_wizard",
    sourceId: entry.sourceId,
    confidence: entry.confidence ?? 1.0,
    metadata: entry.metadata,
  }));

  // Validate required fields
  for (const input of inputs) {
    if (!input.title?.trim() || !input.content?.trim() || !input.type) {
      return NextResponse.json(
        { error: "Each entry requires type, title, and content" },
        { status: 400 }
      );
    }
  }

  const ids =
    inputs.length === 1
      ? [await captureContext(inputs[0])]
      : await captureContextBatch(inputs);

  return NextResponse.json({ ids, count: ids.length }, { status: 201 });
}

/**
 * DELETE /api/brain/entries
 * Soft-delete multiple entries by IDs.
 * Body: { ids: string[] }
 */
export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const { ids } = body as { ids?: string[] };

  if (!ids?.length) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  await db
    .update(contextEntries)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(contextEntries.orgId, org.id),
        sql`${contextEntries.id} = ANY(${ids})`
      )
    );

  return NextResponse.json({ deleted: ids.length });
}
