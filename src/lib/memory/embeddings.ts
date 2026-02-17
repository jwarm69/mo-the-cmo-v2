/**
 * Vector embedding utilities.
 */

import { embed, embedMany } from "ai";
import { embeddingModel } from "@/lib/ai/providers/openai";

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const value = text.trim();
  if (!value) return [];

  const { embedding } = await embed({
    model: embeddingModel,
    value: value.slice(0, 8000),
  });

  return embedding;
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
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
