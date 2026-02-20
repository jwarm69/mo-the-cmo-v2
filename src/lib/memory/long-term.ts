/**
 * Long-term memory: persistent learnings with vector search.
 */

import { desc, eq, sql, and, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentLearnings, learningEmbeddings } from "@/lib/db/schema";
import { generateEmbedding } from "./embeddings";

export interface Learning {
  id: string;
  insight: string;
  category: string;
  confidence: "low" | "medium" | "high" | "validated";
  weight: number;
}

const confidenceWeight: Record<Learning["confidence"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  validated: 4,
};

export async function getRelevantLearnings(
  orgId: string,
  query: string,
  limit: number = 5,
  userId?: string
): Promise<Learning[]> {
  const visibleLearningFilter = userId
    ? sql`(${agentLearnings.userId} IS NULL OR ${agentLearnings.userId} = ${userId})`
    : sql`${agentLearnings.userId} IS NULL`;

  // Try vector search first
  try {
    const queryEmbedding = await generateEmbedding(query);
    if (queryEmbedding.length > 0) {
      const embeddingStr = `[${queryEmbedding.join(",")}]`;

      const rows = await db
        .select({
          id: agentLearnings.id,
          insight: agentLearnings.insight,
          category: agentLearnings.category,
          confidence: agentLearnings.confidence,
          weight: agentLearnings.weight,
          similarity: sql<number>`1 - (${learningEmbeddings.embedding} <=> ${embeddingStr}::vector)`.as("similarity"),
        })
        .from(learningEmbeddings)
        .innerJoin(
          agentLearnings,
          eq(learningEmbeddings.learningId, agentLearnings.id)
        )
        .where(
          and(
            eq(learningEmbeddings.orgId, orgId),
            isNotNull(learningEmbeddings.embedding),
            visibleLearningFilter
          )
        )
        .orderBy(sql`${learningEmbeddings.embedding} <=> ${embeddingStr}::vector`)
        .limit(limit);

      if (rows.length > 0) {
        return rows;
      }
    }
  } catch {
    // Fall through to recency-based fallback
  }

  // Fallback: recency-based with confidence weighting
  const rows = await db
    .select({
      id: agentLearnings.id,
      insight: agentLearnings.insight,
      category: agentLearnings.category,
      confidence: agentLearnings.confidence,
      weight: agentLearnings.weight,
    })
    .from(agentLearnings)
    .where(and(eq(agentLearnings.orgId, orgId), visibleLearningFilter))
    .orderBy(desc(agentLearnings.updatedAt))
    .limit(50);

  const scored = rows.map((row) => ({
    row,
    score: confidenceWeight[row.confidence] + row.weight,
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) => row);
}

export async function storeLearning(
  orgId: string,
  learning: Omit<Learning, "id">,
  userId?: string
): Promise<Learning> {
  const [created] = await db
    .insert(agentLearnings)
    .values({
      orgId,
      userId,
      type: "pattern_recognition",
      category: learning.category,
      insight: learning.insight,
      confidence: learning.confidence,
      weight: learning.weight,
    })
    .returning({
      id: agentLearnings.id,
      insight: agentLearnings.insight,
      category: agentLearnings.category,
      confidence: agentLearnings.confidence,
      weight: agentLearnings.weight,
    });

  // Generate and store embedding for the learning
  try {
    const embeddingText = `${learning.category}: ${learning.insight}`;
    const embedding = await generateEmbedding(embeddingText);
    if (embedding.length > 0) {
      await db.insert(learningEmbeddings).values({
        learningId: created.id,
        orgId,
        userId,
        embedding,
      });
    }
  } catch {
    // Non-critical — learning is stored even without embedding
  }

  return created;
}
