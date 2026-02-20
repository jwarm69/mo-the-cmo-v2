import type { Platform } from "@/lib/types";

export interface ContentBrief {
  angle: string;
  keyMessages: string[];
  ctaStrategy: string;
  toneNotes: string;
  targetEmotion: string;
  differentiator: string;
}

export interface DraftOutput {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  pillar: string;
}

export interface CriticFeedback {
  overallAssessment: string;
  brandAlignmentNotes: string;
  platformFitNotes: string;
  suggestions: string[];
  shouldRevise: boolean;
  revisedDraft?: DraftOutput;
}

export interface ScoreResult {
  overall: number;
  dimensions: {
    brandAlignment: number;
    engagementPotential: number;
    clarity: number;
    ctaStrength: number;
    platformFit: number;
  };
  reasoning: string;
}

export interface AgentLoopResult {
  brief: ContentBrief;
  draft: DraftOutput;
  criticFeedback: CriticFeedback;
  score: ScoreResult;
  finalDraft: DraftOutput;
  totalTokensUsed: number;
}

export interface AgentLoopConfig {
  platform: Platform;
  topic: string;
  pillar?: string;
  brandContext: string;
  ragContext: string;
  learnings: string;
  preferences: string;
  currentState: string;
}
