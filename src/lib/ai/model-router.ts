import { type LanguageModel } from "ai";
import { gpt4o, gpt4oMini } from "./providers/openai";

export type TaskType =
  | "strategy"
  | "campaign_planning"
  | "quarterly_planning"
  | "monthly_planning"
  | "launch_planning"
  | "ideation"
  | "weekly_report"
  | "content_writing"
  | "email_sequence"
  | "ad_copy"
  | "bulk_variations"
  | "hashtags"
  | "reformatting"
  | "chat"
  | "analysis"
  | "channel_strategy"
  | "sales_enablement";

const TASK_MODEL_MAP: Record<TaskType, LanguageModel> = {
  // High-stakes strategic tasks -> GPT-4o
  strategy: gpt4o,
  campaign_planning: gpt4o,
  quarterly_planning: gpt4o,
  monthly_planning: gpt4o,
  launch_planning: gpt4o,
  ideation: gpt4o,
  weekly_report: gpt4o,
  analysis: gpt4o,
  channel_strategy: gpt4o,
  sales_enablement: gpt4o,

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

  // Channel strategy (check before generic "strategy")
  if (
    lower.includes("channel") ||
    lower.includes("channel mix") ||
    lower.includes("which channels") ||
    lower.includes("channel strategy")
  ) {
    return "channel_strategy";
  }

  // Sales enablement
  if (
    lower.includes("battle card") ||
    lower.includes("outbound sequence") ||
    lower.includes("objection handler") ||
    lower.includes("one-pager") ||
    lower.includes("one pager") ||
    lower.includes("pitch deck") ||
    lower.includes("case study") ||
    lower.includes("sales asset") ||
    lower.includes("sales enablement")
  ) {
    return "sales_enablement";
  }

  // Strategic planning (check before generic "plan" to catch specific types)
  if (
    lower.includes("quarter") ||
    lower.includes("q1") ||
    lower.includes("q2") ||
    lower.includes("q3") ||
    lower.includes("q4")
  ) {
    return "quarterly_planning";
  }
  if (
    lower.includes("launch") ||
    lower.includes("go-to-market") ||
    lower.includes("pre-launch")
  ) {
    return "launch_planning";
  }
  if (
    lower.includes("monthly plan") ||
    lower.includes("this month") ||
    lower.includes("next month")
  ) {
    return "monthly_planning";
  }
  if (
    lower.includes("idea") ||
    lower.includes("brainstorm") ||
    lower.includes("guerrilla") ||
    lower.includes("creative marketing") ||
    lower.includes("activation")
  ) {
    return "ideation";
  }

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
    lower.includes("positioning") ||
    lower.includes("icp") ||
    lower.includes("ideal customer") ||
    lower.includes("customer profile")
  ) {
    return "strategy";
  }

  return "chat";
}
