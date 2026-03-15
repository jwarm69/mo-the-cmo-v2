import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { contextEntries } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/memory/embeddings";

/**
 * PATCH /api/brain/entries/[id]
 * Update a single brain entry. Re-generates embedding if title or content change.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const { title, content, type, confidence, metadata } = body as {
    title?: string;
    content?: string;
    type?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  };

  // Fetch existing entry to ensure it belongs to this org
  const [existing] = await db
    .select()
    .from(contextEntries)
    .where(
      and(eq(contextEntries.id, id), eq(contextEntries.orgId, org.id))
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (type !== undefined) updates.type = type;
  if (confidence !== undefined) updates.confidence = confidence;
  if (metadata !== undefined) updates.metadata = metadata;

  // Re-embed if title or content changed
  if (title !== undefined || content !== undefined) {
    const newTitle = title ?? existing.title;
    const newContent = content ?? existing.content;
    const embeddingText = `${newTitle}: ${newContent}`.slice(0, 8000);
    try {
      const embedding = await generateEmbedding(embeddingText);
      if (embedding.length > 0) {
        updates.embedding = embedding;
      }
    } catch {
      // Keep old embedding if re-generation fails
    }
  }

  const [updated] = await db
    .update(contextEntries)
    .set(updates)
    .where(eq(contextEntries.id, id))
    .returning({
      id: contextEntries.id,
      type: contextEntries.type,
      title: contextEntries.title,
      content: contextEntries.content,
      confidence: contextEntries.confidence,
      metadata: contextEntries.metadata,
      updatedAt: contextEntries.updatedAt,
    });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/brain/entries/[id]
 * Soft-delete a single brain entry.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const [entry] = await db
    .select({ id: contextEntries.id })
    .from(contextEntries)
    .where(
      and(eq(contextEntries.id, id), eq(contextEntries.orgId, org.id))
    )
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await db
    .update(contextEntries)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(contextEntries.id, id));

  return NextResponse.json({ deleted: true });
}
