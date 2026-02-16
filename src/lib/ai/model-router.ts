import { type LanguageModel } from "ai";
import { sonnet, opus } from "./providers/anthropic";
import { gpt4oMini } from "./providers/openai";

export type TaskType =
  | "strategy"
  | "campaign_planning"
  | "weekly_report"
  | "content_writing"
  | "email_sequence"
  | "ad_copy"
  | "bulk_variations"
  | "hashtags"
  | "reformatting"
  | "chat"
  | "analysis";

const TASK_MODEL_MAP: Record<TaskType, LanguageModel> = {
  // High-stakes strategic tasks -> Opus
  strategy: opus,
  campaign_planning: opus,
  weekly_report: opus,
  analysis: opus,

  // Creative content tasks -> Sonnet
  content_writing: sonnet,
  email_sequence: sonnet,
  ad_copy: sonnet,
  chat: sonnet,

  // Bulk/commodity tasks -> GPT-4o-mini
  bulk_variations: gpt4oMini,
  hashtags: gpt4oMini,
  reformatting: gpt4oMini,
};

export function routeTask(taskType: TaskType): LanguageModel {
  return TASK_MODEL_MAP[taskType];
}

export function inferTaskType(message: string): TaskType {
  const lower = message.toLowerCase();

  if (
    lower.includes("strategy") ||
    lower.includes("plan") ||
    lower.includes("analyze")
  ) {
    return "strategy";
  }
  if (lower.includes("campaign")) return "campaign_planning";
  if (lower.includes("report") || lower.includes("performance")) {
    return "weekly_report";
  }
  if (lower.includes("email") || lower.includes("sequence")) {
    return "email_sequence";
  }
  if (lower.includes("ad") || lower.includes("copy")) return "ad_copy";
  if (lower.includes("variation") || lower.includes("bulk")) {
    return "bulk_variations";
  }
  if (lower.includes("hashtag")) return "hashtags";

  return "chat";
}
