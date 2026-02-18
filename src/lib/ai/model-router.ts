import { type LanguageModel } from "ai";
import { gpt4o, gpt4oMini } from "./providers/openai";

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
  // High-stakes strategic tasks -> GPT-4o
  strategy: gpt4o,
  campaign_planning: gpt4o,
  weekly_report: gpt4o,
  analysis: gpt4o,

  // Creative content tasks -> GPT-4o
  content_writing: gpt4o,
  email_sequence: gpt4o,
  ad_copy: gpt4o,
  chat: gpt4o,

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

  if (lower.includes("campaign")) return "campaign_planning";
  if (
    lower.includes("report") ||
    lower.includes("weekly update") ||
    lower.includes("performance summary")
  ) {
    return "weekly_report";
  }
  if (
    lower.includes("analy") ||
    lower.includes("metrics") ||
    lower.includes("kpi")
  ) {
    return "analysis";
  }
  if (lower.includes("email") || lower.includes("sequence")) {
    return "email_sequence";
  }
  if (lower.includes("hashtag")) return "hashtags";
  if (
    lower.includes("variation") ||
    lower.includes("bulk") ||
    lower.includes("multiple versions")
  ) {
    return "bulk_variations";
  }
  if (
    lower.includes("rewrite") ||
    lower.includes("reformat") ||
    lower.includes("repurpose")
  ) {
    return "reformatting";
  }
  if (
    lower.includes("ad copy") ||
    lower.includes("headline") ||
    lower.includes("ad creative")
  ) {
    return "ad_copy";
  }
  if (
    lower.includes("write") ||
    lower.includes("caption") ||
    lower.includes("script") ||
    lower.includes("content")
  ) {
    return "content_writing";
  }
  if (
    lower.includes("strategy") ||
    lower.includes("plan") ||
    lower.includes("go-to-market") ||
    lower.includes("positioning")
  ) {
    return "strategy";
  }

  return "chat";
}
