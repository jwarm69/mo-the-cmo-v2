/**
 * Vector embedding utilities.
 * Sprint 1: Stub.
 * Sprint 2: Full implementation with OpenAI embeddings + pgvector.
 */

export async function generateEmbedding(
  _text: string
): Promise<number[]> {
  // Sprint 2: Use OpenAI text-embedding-3-small
  return [];
}

export async function cosineSimilarity(a: number[], b: number[]): Promise<number> {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
