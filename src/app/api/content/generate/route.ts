import { NextResponse } from "next/server";
import { generateText } from "ai";
import { sonnet } from "@/lib/ai/providers/anthropic";
import { buildContentGenerationPrompt } from "@/lib/ai/prompts/system";
import { assembleContext } from "@/lib/rag/context";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { insertContent } from "@/lib/db/content";
import { checkUsageLimit, recordUsage } from "@/lib/usage/tracker";
import { runAgentLoop } from "@/lib/ai/agent-loop/runner";
import type { Platform } from "@/lib/types";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  if (!user.isApiKeyUser) {
    const usage = await checkUsageLimit(user.id, user.usageLimitCents);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Usage limit reached. You've spent $${(usage.spentCents / 100).toFixed(2)} of your $${(usage.limitCents / 100).toFixed(2)} limit.`,
        },
        { status: 429 }
      );
    }
  }

  const body = await req.json();
  const {
    platform,
    topic,
    pillar,
    campaignId,
    useAgentLoop: useAgentLoopRaw,
  } = body as {
    platform: Platform;
    topic: string;
    pillar?: string;
    campaignId?: string;
    useAgentLoop?: boolean;
  };
  const useAgentLoop = useAgentLoopRaw !== false;

  if (!platform || !topic) {
    return NextResponse.json(
      { error: "platform and topic are required" },
      { status: 400 }
    );
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const { brandContext, ragContext, learnings, preferences, currentState } =
    await assembleContext(org.id, topic);

  // ── Agent Loop path ─────────────────────────────────────────────
  if (useAgentLoop) {
    const result = await runAgentLoop({
      platform,
      topic,
      pillar,
      brandContext,
      ragContext,
      learnings,
      preferences,
      currentState,
    });

    // Record usage for each step
    if (!user.isApiKeyUser) {
      for (const step of result.stepUsages) {
        await recordUsage({
          userId: user.id,
          orgId: org.id,
          model: step.model,
          route: "/api/content/generate[agent-loop]",
          inputTokens: step.inputTokens,
          outputTokens: step.outputTokens,
        });
      }
    }

    const item = await insertContent(org.id, {
      platform,
      hook: result.finalDraft.hook,
      body: result.finalDraft.body,
      cta: result.finalDraft.cta,
      hashtags: result.finalDraft.hashtags,
      pillar: result.finalDraft.pillar || pillar || "General",
      topic,
      campaignId,
      performanceScore: result.score.overall,
      agentLoopMetadata: {
        brief: result.brief,
        criticFeedback: result.criticFeedback,
        score: result.score,
        totalTokensUsed: result.totalTokensUsed,
      },
    });

    return NextResponse.json(item);
  }

  // ── Single-shot path (unchanged) ───────────────────────────────
  const prompt = buildContentGenerationPrompt(
    platform,
    topic,
    pillar,
    brandContext,
    ragContext,
    {
      learnings,
      preferences,
      currentState,
    }
  );

  const { text, usage } = await generateText({
    model: sonnet,
    prompt,
  });

  if (!user.isApiKeyUser && usage) {
    await recordUsage({
      userId: user.id,
      orgId: org.id,
      model: "claude-sonnet-4-5-20250929",
      route: "/api/content/generate",
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    });
  }

  let parsed: { hook: string; body: string; cta: string; hashtags: string[]; pillar: string };
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      hook: "",
      body: text,
      cta: "",
      hashtags: [],
      pillar: pillar || "General",
    };
  }

  const item = await insertContent(org.id, {
    platform,
    hook: parsed.hook,
    body: parsed.body,
    cta: parsed.cta,
    hashtags: parsed.hashtags,
    pillar: parsed.pillar || pillar || "General",
    topic,
    campaignId,
  });

  return NextResponse.json(item);
}
