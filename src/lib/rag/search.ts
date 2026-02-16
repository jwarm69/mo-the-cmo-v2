/**
 * RAG semantic search.
 * Sprint 1: Stub.
 * Sprint 2: Full pgvector similarity search.
 */

export interface SearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  documentTitle: string;
}

export async function searchKnowledge(
  _orgId: string,
  _query: string,
  _limit: number = 5
): Promise<SearchResult[]> {
  // Sprint 2: Implement pgvector cosine similarity search
  return [];
}
