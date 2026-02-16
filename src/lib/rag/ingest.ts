/**
 * RAG ingestion pipeline.
 * Sprint 1: Stub.
 * Sprint 2: Full implementation - chunk docs, embed, store in pgvector.
 */

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
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - chunkOverlap;
  }

  return chunks;
}

export async function ingestDocument(
  _orgId: string,
  _title: string,
  _content: string,
  _sourceType: string = "file"
): Promise<{ documentId: string; chunkCount: number }> {
  // Sprint 2: Full implementation
  return { documentId: crypto.randomUUID(), chunkCount: 0 };
}
