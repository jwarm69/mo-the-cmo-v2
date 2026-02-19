import { db } from "@/lib/db/client";
import { usageTracking } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { calculateCostCents } from "./pricing";

export interface UsageLimitResult {
  allowed: boolean;
  spentCents: number;
  limitCents: number;
  remainingCents: number;
}

export async function checkUsageLimit(
  userId: string,
  limitCents: number
): Promise<UsageLimitResult> {
  // 0 = no limit (API key users)
  if (limitCents === 0) {
    return { allowed: true, spentCents: 0, limitCents: 0, remainingCents: Infinity };
  }

  const result = await db
    .select({
      total: sql<number>`coalesce(sum(${usageTracking.costCents}), 0)`,
    })
    .from(usageTracking)
    .where(eq(usageTracking.userId, userId));

  const spentCents = result[0]?.total ?? 0;
  const remainingCents = Math.max(0, limitCents - spentCents);

  return {
    allowed: spentCents < limitCents,
    spentCents,
    limitCents,
    remainingCents,
  };
}

export interface RecordUsageInput {
  userId: string;
  orgId: string | null;
  model: string;
  route: string;
  inputTokens: number;
  outputTokens: number;
}

export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const totalTokens = input.inputTokens + input.outputTokens;
  const costCents = calculateCostCents(
    input.model,
    input.inputTokens,
    input.outputTokens
  );

  await db.insert(usageTracking).values({
    userId: input.userId,
    orgId: input.orgId,
    model: input.model,
    route: input.route,
    promptTokens: input.inputTokens,
    completionTokens: input.outputTokens,
    totalTokens,
    costCents,
  });
}
