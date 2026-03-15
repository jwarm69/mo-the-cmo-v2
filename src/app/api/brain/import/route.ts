import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { contextEntries } from "@/lib/db/schema";
import {
  captureContextBatch,
  type CaptureInput,
  type ContextType,
} from "@/lib/brain/context-brain";

/**
 * POST /api/brain/import
 * Bulk import entries from parsed YAML/JSON.
 * Expects: { entries: Array<{ type, title, content, sourceId?, metadata? }>, source?: string }
 * Deduplicates by source + sourceId to prevent duplicate imports.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const { entries, source = "yaml_import" } = body as {
    entries: Array<{
      type: ContextType;
      title: string;
      content: string;
      sourceId?: string;
      confidence?: number;
      metadata?: Record<string, unknown>;
    }>;
    source?: string;
  };

  if (!entries?.length) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  // Check for existing entries with same source + sourceId for deduplication
  const sourceIds = entries
    .map((e) => e.sourceId)
    .filter((id): id is string => !!id);

  let existingSourceIds = new Set<string>();
  if (sourceIds.length > 0) {
    const existing = await db
      .select({ sourceId: contextEntries.sourceId })
      .from(contextEntries)
      .where(
        and(
          eq(contextEntries.orgId, org.id),
          eq(contextEntries.source, source),
          eq(contextEntries.isActive, true)
        )
      );

    existingSourceIds = new Set(
      existing.map((e) => e.sourceId).filter((id): id is string => !!id)
    );
  }

  // Filter out duplicates
  const newEntries = entries.filter(
    (e) => !e.sourceId || !existingSourceIds.has(e.sourceId)
  );

  if (newEntries.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: entries.length,
      message: "All entries already exist",
    });
  }

  const inputs: CaptureInput[] = newEntries.map((entry) => ({
    orgId: org.id,
    userId: user.isApiKeyUser ? undefined : user.id,
    type: entry.type,
    title: entry.title,
    content: entry.content,
    source,
    sourceId: entry.sourceId,
    confidence: entry.confidence ?? 1.0,
    metadata: entry.metadata,
  }));

  const ids = await captureContextBatch(inputs);

  return NextResponse.json(
    {
      imported: ids.length,
      skipped: entries.length - newEntries.length,
      ids,
    },
    { status: 201 }
  );
}
