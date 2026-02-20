import { PLATFORM_TEMPLATES } from "@/lib/ai/prompts/system";
import type { AgentLoopConfig, ContentBrief, CriticFeedback, DraftOutput } from "./types";

function contextBlock(config: AgentLoopConfig): string {
  let block = "";
  if (config.brandContext) block += `\n## Brand Context\n${config.brandContext}`;
  if (config.ragContext) block += `\n\n## Knowledge Base\n${config.ragContext}`;
  if (config.learnings) block += `\n\n## Past Learnings\n${config.learnings}`;
  if (config.preferences) block += `\n\n## User Preferences\n${config.preferences}`;
  if (config.currentState) {
    block += `\n\n## Current State\nUse this to avoid repeating already scheduled/published content:\n${config.currentState}`;
  }
  return block;
}

export function buildPlannerPrompt(config: AgentLoopConfig): string {
  return `You are a strategic marketing planner. Analyze the topic and brand context to create a content brief.

## Topic
${config.topic}

## Platform
${config.platform}
${contextBlock(config)}

## Task
Create a strategic content brief. Consider the brand voice, target audience, past learnings, and user preferences to craft an approach that will resonate.

## Output Format
Respond in JSON only (no markdown code fences):
{
  "angle": "The creative angle or narrative frame for the content",
  "keyMessages": ["message1", "message2", "message3"],
  "ctaStrategy": "What the CTA should accomplish and how",
  "toneNotes": "Specific tone guidance for this piece",
  "targetEmotion": "The primary emotion to evoke",
  "differentiator": "What makes this content stand out from competitors"
}`;
}

export function buildDrafterPrompt(config: AgentLoopConfig, brief: ContentBrief): string {
  return `You are Mo, an expert marketing content creator. Write content based on the strategic brief provided.

## Platform Requirements
${PLATFORM_TEMPLATES[config.platform]}

## Topic
${config.topic}

## Content Pillar
${config.pillar || "General"}

## Strategic Brief
- Angle: ${brief.angle}
- Key Messages: ${brief.keyMessages.join("; ")}
- CTA Strategy: ${brief.ctaStrategy}
- Tone: ${brief.toneNotes}
- Target Emotion: ${brief.targetEmotion}
- Differentiator: ${brief.differentiator}
${contextBlock(config)}

## Output Format
Respond in JSON only (no markdown code fences):
{
  "hook": "The attention-grabbing opener",
  "body": "The main content body",
  "cta": "The call-to-action",
  "hashtags": ["#tag1", "#tag2"],
  "pillar": "${config.pillar || "General"}"
}`;
}

export function buildCriticPrompt(
  config: AgentLoopConfig,
  brief: ContentBrief,
  draft: DraftOutput
): string {
  return `You are a senior marketing strategist reviewing content for quality, brand alignment, and platform fit.

## Original Brief
- Angle: ${brief.angle}
- Key Messages: ${brief.keyMessages.join("; ")}
- CTA Strategy: ${brief.ctaStrategy}
- Target Emotion: ${brief.targetEmotion}

## Draft Content
- Hook: ${draft.hook}
- Body: ${draft.body}
- CTA: ${draft.cta}
- Hashtags: ${draft.hashtags.join(", ")}

## Platform
${config.platform} — ${PLATFORM_TEMPLATES[config.platform]}
${contextBlock(config)}

## Task
Evaluate the draft against the brief, brand guidelines, platform best practices, and past learnings. If the draft needs significant improvement, set shouldRevise to true and provide a revisedDraft.

## Output Format
Respond in JSON only (no markdown code fences):
{
  "overallAssessment": "1-2 sentence summary of quality",
  "brandAlignmentNotes": "How well it matches brand voice and guidelines",
  "platformFitNotes": "How well it fits the platform format",
  "suggestions": ["improvement1", "improvement2"],
  "shouldRevise": false,
  "revisedDraft": null
}

If shouldRevise is true, include revisedDraft with the same shape:
{
  "hook": "...", "body": "...", "cta": "...", "hashtags": [...], "pillar": "..."
}`;
}

export function buildScorerPrompt(
  draft: DraftOutput,
  brief: ContentBrief,
  criticFeedback: CriticFeedback
): string {
  return `You are a content scoring system. Score the final draft on 5 dimensions (0-100 each).

## Content
- Hook: ${draft.hook}
- Body: ${draft.body}
- CTA: ${draft.cta}

## Brief
- Angle: ${brief.angle}
- Target Emotion: ${brief.targetEmotion}

## Critic Assessment
${criticFeedback.overallAssessment}
Brand alignment: ${criticFeedback.brandAlignmentNotes}
Platform fit: ${criticFeedback.platformFitNotes}

## Output Format
Respond in JSON only (no markdown code fences):
{
  "overall": 75,
  "dimensions": {
    "brandAlignment": 80,
    "engagementPotential": 70,
    "clarity": 85,
    "ctaStrength": 65,
    "platformFit": 75
  },
  "reasoning": "Brief explanation of the scores"
}`;
}
