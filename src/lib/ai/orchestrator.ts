import { routeTask, inferTaskType, type TaskType } from "./model-router";
import { buildContextualPrompt } from "./prompts/system";

export interface AgentContext {
  brandProfile?: string;
  ragContext?: string;
  learnings?: string;
  preferences?: string;
  recentPerformance?: string;
}

export interface AgentResult {
  content: string;
  taskType: TaskType;
  modelUsed: string;
  tokensUsed?: number;
}

/**
 * Main orchestrator for Mo's agent loop.
 * Plan -> Execute -> Review -> Learn
 *
 * Sprint 1: Basic orchestration (route to model, build context)
 * Sprint 6: Full agent loop with learning
 */
export async function orchestrate(
  userMessage: string,
  context: AgentContext = {}
): Promise<{ systemPrompt: string; taskType: TaskType }> {
  const taskType = inferTaskType(userMessage);

  const systemPrompt = buildContextualPrompt(
    context.brandProfile,
    context.ragContext,
    context.learnings,
    context.preferences
  );

  return { systemPrompt, taskType };
}
