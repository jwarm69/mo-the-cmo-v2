/**
 * RAG semantic search using pgvector cosine similarity.
 */

import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { knowledgeChunks, knowledgeDocuments } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/memory/embeddings";

export interface SearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  documentTitle: string;
}

export async function searchKnowledge(
  orgId: string,
  query: string,
  limit: number = 5,
  _orgSlug?: string
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch {
    // If embedding fails, fall back to empty results
    return [];
  }

  if (queryEmbedding.length === 0) return [];

  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const rows = await db
    .select({
      chunkId: knowledgeChunks.id,
      content: knowledgeChunks.content,
      similarity: sql<number>`1 - (${knowledgeChunks.embedding} <=> ${embeddingStr}::vector)`.as("similarity"),
      documentTitle: knowledgeDocuments.title,
    })
    .from(knowledgeChunks)
    .innerJoin(
      knowledgeDocuments,
      eq(knowledgeChunks.documentId, knowledgeDocuments.id)
    )
    .where(
      and(
        eq(knowledgeChunks.orgId, orgId),
        isNotNull(knowledgeChunks.embedding)
      )
    )
    .orderBy(sql`${knowledgeChunks.embedding} <=> ${embeddingStr}::vector`)
    .limit(limit);

  return rows.map((row) => ({
    chunkId: row.chunkId,
    content: row.content,
    similarity: row.similarity,
    documentTitle: row.documentTitle,
  }));
}
