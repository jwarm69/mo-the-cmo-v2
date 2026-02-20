import { generateText } from "ai";
import { gpt4o, gpt4oMini } from "@/lib/ai/providers/openai";
import { sonnet } from "@/lib/ai/providers/anthropic";
import { buildPlannerPrompt, buildDrafterPrompt, buildCriticPrompt, buildScorerPrompt } from "./prompts";
import type {
  AgentLoopConfig,
  AgentLoopResult,
  ContentBrief,
  CriticFeedback,
  DraftOutput,
  ScoreResult,
} from "./types";

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

interface StepUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AgentLoopRunResult extends AgentLoopResult {
  stepUsages: StepUsage[];
}

export async function runAgentLoop(config: AgentLoopConfig): Promise<AgentLoopRunResult> {
  const stepUsages: StepUsage[] = [];
  let totalTokens = 0;

  // Step 1: Plan
  const planResult = await generateText({
    model: gpt4oMini,
    prompt: buildPlannerPrompt(config),
  });

  const planTokens = (planResult.usage?.inputTokens ?? 0) + (planResult.usage?.outputTokens ?? 0);
  totalTokens += planTokens;
  stepUsages.push({
    model: "gpt-4o-mini",
    inputTokens: planResult.usage?.inputTokens ?? 0,
    outputTokens: planResult.usage?.outputTokens ?? 0,
  });

  const brief = parseJSON<ContentBrief>(planResult.text, {
    angle: "Direct approach",
    keyMessages: [config.topic],
    ctaStrategy: "Engage audience",
    toneNotes: "Professional and engaging",
    targetEmotion: "curiosity",
    differentiator: "Unique brand perspective",
  });

  // Step 2: Draft
  const draftResult = await generateText({
    model: sonnet,
    prompt: buildDrafterPrompt(config, brief),
  });

  const draftTokens = (draftResult.usage?.inputTokens ?? 0) + (draftResult.usage?.outputTokens ?? 0);
  totalTokens += draftTokens;
  stepUsages.push({
    model: "claude-sonnet-4-5-20250929",
    inputTokens: draftResult.usage?.inputTokens ?? 0,
    outputTokens: draftResult.usage?.outputTokens ?? 0,
  });

  const draft = parseJSON<DraftOutput>(draftResult.text, {
    hook: "",
    body: draftResult.text,
    cta: "",
    hashtags: [],
    pillar: config.pillar || "General",
  });

  // Step 3: Critic
  const criticResult = await generateText({
    model: gpt4o,
    prompt: buildCriticPrompt(config, brief, draft),
  });

  const criticTokens = (criticResult.usage?.inputTokens ?? 0) + (criticResult.usage?.outputTokens ?? 0);
  totalTokens += criticTokens;
  stepUsages.push({
    model: "gpt-4o",
    inputTokens: criticResult.usage?.inputTokens ?? 0,
    outputTokens: criticResult.usage?.outputTokens ?? 0,
  });

  const criticFeedback = parseJSON<CriticFeedback>(criticResult.text, {
    overallAssessment: "Content review completed",
    brandAlignmentNotes: "Acceptable",
    platformFitNotes: "Acceptable",
    suggestions: [],
    shouldRevise: false,
  });

  // Use revised draft if critic provided one
  const finalDraft = criticFeedback.shouldRevise && criticFeedback.revisedDraft
    ? criticFeedback.revisedDraft
    : draft;

  // Step 4: Score
  const scoreResult = await generateText({
    model: gpt4oMini,
    prompt: buildScorerPrompt(finalDraft, brief, criticFeedback),
  });

  const scoreTokens = (scoreResult.usage?.inputTokens ?? 0) + (scoreResult.usage?.outputTokens ?? 0);
  totalTokens += scoreTokens;
  stepUsages.push({
    model: "gpt-4o-mini",
    inputTokens: scoreResult.usage?.inputTokens ?? 0,
    outputTokens: scoreResult.usage?.outputTokens ?? 0,
  });

  const score = parseJSON<ScoreResult>(scoreResult.text, {
    overall: 70,
    dimensions: {
      brandAlignment: 70,
      engagementPotential: 70,
      clarity: 70,
      ctaStrength: 70,
      platformFit: 70,
    },
    reasoning: "Default score — scoring step did not return valid JSON",
  });

  return {
    brief,
    draft,
    criticFeedback,
    score,
    finalDraft,
    totalTokensUsed: totalTokens,
    stepUsages,
  };
}
