import { routeTask, inferTaskType, type TaskType } from "./model-router";
import { buildContextualPrompt } from "./prompts/system";
import { type LanguageModel } from "ai";

export interface AgentContext {
  brandProfile?: string;
  ragContext?: string;
  learnings?: string;
  preferences?: string;
  currentState?: string;
  recentPerformance?: string;
  productsContext?: string;
  goalsContext?: string;
  plansContext?: string;
  brainContext?: string;
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
 */
export async function orchestrate(
  userMessage: string,
  context: AgentContext = {}
): Promise<{
  systemPrompt: string;
  taskType: TaskType;
  model: LanguageModel;
}> {
  const taskType = inferTaskType(userMessage);
  const model = routeTask(taskType);

  const systemPrompt = buildContextualPrompt(
    context.brandProfile,
    context.ragContext,
    context.learnings,
    context.preferences,
    context.currentState,
    context.productsContext,
    context.goalsContext,
    context.plansContext,
    context.brainContext
  );

  return { systemPrompt, taskType, model };
}
