/**
 * Long-term memory: persistent learnings retrieved via semantic search.
 * Sprint 1: Stub for architecture completeness.
 * Sprint 6: Full implementation with pgvector search.
 */

export interface Learning {
  id: string;
  insight: string;
  category: string;
  confidence: "low" | "medium" | "high" | "validated";
  weight: number;
}

export async function getRelevantLearnings(
  _orgId: string,
  _query: string,
  _limit: number = 5
): Promise<Learning[]> {
  // Sprint 6: Implement semantic search over agent_learnings
  return [];
}

export async function storeLearning(
  _orgId: string,
  _learning: Omit<Learning, "id">
): Promise<Learning> {
  // Sprint 6: Store in agent_learnings + embed
  return {
    id: crypto.randomUUID(),
    ..._learning,
  };
}
