/**
 * RAG ingestion pipeline.
 * Chunks source documents and persists them for retrieval.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { knowledgeChunks, knowledgeDocuments } from "@/lib/db/schema";

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const { chunkSize = 1000, chunkOverlap = 200 } = options;
  const chunks: string[] = [];
  if (!text.trim()) return chunks;

  const safeChunkSize = Math.max(200, chunkSize);
  const safeOverlap = Math.min(Math.max(0, chunkOverlap), safeChunkSize - 1);
  const step = safeChunkSize - safeOverlap;
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + safeChunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start += step;
  }

  return chunks;
}

export async function ingestDocument(
  orgId: string,
  title: string,
  content: string,
  sourceType: string = "file"
): Promise<{ documentId: string; chunkCount: number }> {
  const chunks = chunkText(content);

  const [document] = await db
    .insert(knowledgeDocuments)
    .values({
      orgId,
      title,
      content,
      sourceType,
      chunkCount: chunks.length,
    })
    .returning({ id: knowledgeDocuments.id });

  if (chunks.length > 0) {
    await db.insert(knowledgeChunks).values(
      chunks.map((chunk, index) => ({
        documentId: document.id,
        orgId,
        content: chunk,
        chunkIndex: index,
      }))
    );
  }

  await db
    .update(knowledgeDocuments)
    .set({ chunkCount: chunks.length, updatedAt: new Date() })
    .where(eq(knowledgeDocuments.id, document.id));

  return { documentId: document.id, chunkCount: chunks.length };
}
