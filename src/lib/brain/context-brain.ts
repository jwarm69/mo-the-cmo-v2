/**
 * Unified Company Brain — the core intelligence layer.
 *
 * Every meaningful interaction auto-captures context into a single
 * vector-searchable store. Every AI call draws from it. The company's
 * marketing brain grows with every conversation, plan, and decision.
 */

import { and, desc, eq, sql, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contextEntries } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/memory/embeddings";
import type { ContextEntry } from "@/lib/db/schema";

export type ContextType = ContextEntry["type"];

export interface CaptureInput {
  orgId: string;
  userId?: string;
  type: ContextType;
  title: string;
  content: string;
  source: string;
  sourceId?: string;
  confidence?: number;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface BrainSearchResult {
  id: string;
  type: ContextType;
  title: string;
  content: string;
  source: string;
  confidence: number;
  similarity: number;
  createdAt: Date;
}

/**
 * Capture a piece of context into the company brain.
 * Automatically generates an embedding for vector search.
 */
export async function captureContext(input: CaptureInput): Promise<string> {
  const embeddingText = `${input.title}: ${input.content}`.slice(0, 8000);

  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(embeddingText);
    if (embedding.length === 0) embedding = null;
  } catch {
    // Store without embedding — still valuable as structured data
  }

  const [created] = await db
    .insert(contextEntries)
    .values({
      orgId: input.orgId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      content: input.content,
      source: input.source,
      sourceId: input.sourceId,
      embedding,
      confidence: input.confidence ?? 1.0,
      expiresAt: input.expiresAt,
      metadata: input.metadata,
    })
    .returning({ id: contextEntries.id });

  return created.id;
}

/**
 * Capture multiple context entries in batch (e.g., from a plan generation).
 */
export async function captureContextBatch(
  inputs: CaptureInput[]
): Promise<string[]> {
  const ids: string[] = [];
  // Process in parallel batches of 5 to balance speed vs rate limits
  for (let i = 0; i < inputs.length; i += 5) {
    const batch = inputs.slice(i, i + 5);
    const results = await Promise.all(batch.map(captureContext));
    ids.push(...results);
  }
  return ids;
}

/**
 * Search the company brain using vector similarity.
 * Returns the most relevant context entries for a given query.
 */
export async function searchBrain(
  orgId: string,
  query: string,
  limit: number = 8,
  typeFilter?: ContextType[]
): Promise<BrainSearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    if (queryEmbedding.length === 0) {
      return fallbackSearch(orgId, limit, typeFilter);
    }

    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    let whereClause = and(
      eq(contextEntries.orgId, orgId),
      eq(contextEntries.isActive, true),
      isNotNull(contextEntries.embedding)
    );

    if (typeFilter && typeFilter.length > 0) {
      whereClause = and(
        whereClause,
        sql`${contextEntries.type} = ANY(${typeFilter})`
      );
    }

    const rows = await db
      .select({
        id: contextEntries.id,
        type: contextEntries.type,
        title: contextEntries.title,
        content: contextEntries.content,
        source: contextEntries.source,
        confidence: contextEntries.confidence,
        similarity: sql<number>`1 - (${contextEntries.embedding} <=> ${embeddingStr}::vector)`.as(
          "similarity"
        ),
        createdAt: contextEntries.createdAt,
      })
      .from(contextEntries)
      .where(whereClause)
      .orderBy(sql`${contextEntries.embedding} <=> ${embeddingStr}::vector`)
      .limit(limit);

    return rows;
  } catch {
    return fallbackSearch(orgId, limit, typeFilter);
  }
}

/**
 * Fallback: recency-based search when vector search fails.
 */
async function fallbackSearch(
  orgId: string,
  limit: number,
  typeFilter?: ContextType[]
): Promise<BrainSearchResult[]> {
  let whereClause = and(
    eq(contextEntries.orgId, orgId),
    eq(contextEntries.isActive, true)
  );

  if (typeFilter && typeFilter.length > 0) {
    whereClause = and(
      whereClause,
      sql`${contextEntries.type} = ANY(${typeFilter})`
    );
  }

  const rows = await db
    .select({
      id: contextEntries.id,
      type: contextEntries.type,
      title: contextEntries.title,
      content: contextEntries.content,
      source: contextEntries.source,
      confidence: contextEntries.confidence,
      createdAt: contextEntries.createdAt,
    })
    .from(contextEntries)
    .where(whereClause)
    .orderBy(desc(contextEntries.updatedAt))
    .limit(limit);

  return rows.map((row) => ({ ...row, similarity: 0 }));
}

/**
 * Get a structured summary of the company brain for a given org.
 * Used in context assembly to give Mo a high-level view of what it knows.
 */
export async function getBrainSummary(orgId: string): Promise<string> {
  const typeCounts = await db
    .select({
      type: contextEntries.type,
      count: sql<number>`count(*)::int`,
    })
    .from(contextEntries)
    .where(
      and(eq(contextEntries.orgId, orgId), eq(contextEntries.isActive, true))
    )
    .groupBy(contextEntries.type);

  if (typeCounts.length === 0) {
    return "Company brain is empty — no context captured yet.";
  }

  const lines = ["Company Brain Summary:"];
  for (const row of typeCounts) {
    lines.push(`- ${row.type}: ${row.count} entries`);
  }

  return lines.join("\n");
}

/**
 * Format brain search results into a prompt-ready string.
 */
export function formatBrainContext(results: BrainSearchResult[]): string {
  if (results.length === 0) return "";

  return results
    .map(
      (r, i) =>
        `(${i + 1}) [${r.type}] ${r.title}: ${r.content} (confidence=${r.confidence.toFixed(1)})`
    )
    .join("\n\n");
}
