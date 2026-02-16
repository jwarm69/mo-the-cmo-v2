/**
 * Long-term memory: persistent learnings.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentLearnings } from "@/lib/db/schema";

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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
}

export async function getRelevantLearnings(
  orgId: string,
  query: string,
  limit: number = 5
): Promise<Learning[]> {
  const rows = await db
    .select({
      id: agentLearnings.id,
      insight: agentLearnings.insight,
      category: agentLearnings.category,
      confidence: agentLearnings.confidence,
      weight: agentLearnings.weight,
    })
    .from(agentLearnings)
    .where(eq(agentLearnings.orgId, orgId))
    .orderBy(desc(agentLearnings.updatedAt))
    .limit(100);

  const tokens = tokenize(query);

  const scored = rows.map((row) => {
    const searchable = `${row.category} ${row.insight}`.toLowerCase();
    const tokenScore =
      tokens.length === 0
        ? 0
        : tokens.reduce((sum, token) => sum + (searchable.includes(token) ? 1 : 0), 0);
    const score = tokenScore + confidenceWeight[row.confidence] + row.weight;
    return { row, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) => row);
}

export async function storeLearning(
  orgId: string,
  learning: Omit<Learning, "id">
): Promise<Learning> {
  const [created] = await db
    .insert(agentLearnings)
    .values({
      orgId,
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

  return created;
}
