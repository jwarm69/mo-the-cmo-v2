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
import { db } from "@/lib/db/client";
import { contentTemplates, contentItems as contentItemsTable } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Platform } from "@/lib/types";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const memoryUserId = user.isApiKeyUser ? undefined : user.id;

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
    templateId,
    variantCount: variantCountRaw,
    useAgentLoop: useAgentLoopRaw,
  } = body as {
    platform: Platform;
    topic: string;
    pillar?: string;
    campaignId?: string;
    templateId?: string;
    variantCount?: number;
    useAgentLoop?: boolean;
  };
  const useAgentLoop = useAgentLoopRaw !== false;
  const variantCount = Math.min(Math.max(variantCountRaw || 1, 1), 3);

  if (!platform || !topic) {
    return NextResponse.json(
      { error: "platform and topic are required" },
      { status: 400 }
    );
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  // Fetch template if provided
  let templateContext = "";
  if (templateId) {
    const [template] = await db
      .select()
      .from(contentTemplates)
      .where(eq(contentTemplates.id, templateId))
      .limit(1);
    if (template?.structure) {
      const s = template.structure as { hook_type: string; body_format: string; cta_pattern: string; example: string };
      templateContext = `\n\n## Template Constraint\nFollow this structural template:\n- Hook Type: ${s.hook_type}\n- Body Format: ${s.body_format}\n- CTA Pattern: ${s.cta_pattern}\n- Example: ${s.example}`;
      // Increment usage count
      await db
        .update(contentTemplates)
        .set({ usageCount: sql`${contentTemplates.usageCount} + 1`, lastUsedAt: new Date() })
        .where(eq(contentTemplates.id, templateId));
    }
  }

  const { brandContext, ragContext, learnings, preferences, currentState } =
    await assembleContext(org.id, topic, memoryUserId);

  // ── Agent Loop path ─────────────────────────────────────────────
  if (useAgentLoop) {
    const items = [];
    let firstItemId: string | null = null;

    for (let v = 0; v < variantCount; v++) {
      const variantBrief = variantCount > 1
        ? `\nVariant ${v + 1} of ${variantCount}. ${v === 0 ? "Use a direct, benefit-focused angle." : v === 1 ? "Use a storytelling or emotional angle." : "Use a contrarian or surprising angle."}`
        : "";

      const result = await runAgentLoop({
        platform,
        topic: topic + variantBrief,
        pillar,
        brandContext: brandContext + templateContext,
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
          variantIndex: variantCount > 1 ? v : undefined,
        },
      });

      // Link variants via sourceContentId
      if (variantCount > 1 && firstItemId) {
        // Update to link to first variant
        await db
          .update(contentItemsTable)
          .set({ sourceContentId: firstItemId })
          .where(eq(contentItemsTable.id, item.id));
      }
      if (v === 0) firstItemId = item.id;
      items.push(item);
    }

    return NextResponse.json(variantCount > 1 ? items : items[0]);
  }

  // ── Single-shot path ───────────────────────────────────────────
  const prompt = buildContentGenerationPrompt(
    platform,
    topic,
    pillar,
    brandContext + templateContext,
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
