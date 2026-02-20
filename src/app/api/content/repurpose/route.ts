import { NextResponse } from "next/server";
import { generateText } from "ai";
import { sonnet } from "@/lib/ai/providers/anthropic";
import { PLATFORM_TEMPLATES } from "@/lib/ai/prompts/system";
import { assembleContext } from "@/lib/rag/context";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { getContentById, insertContent } from "@/lib/db/content";
import { checkUsageLimit, recordUsage } from "@/lib/usage/tracker";
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
        { error: `Usage limit reached.` },
        { status: 429 }
      );
    }
  }

  const body = await req.json();
  const { sourceContentId, targetPlatform } = body as {
    sourceContentId: string;
    targetPlatform: Platform;
  };

  if (!sourceContentId || !targetPlatform) {
    return NextResponse.json(
      { error: "sourceContentId and targetPlatform are required" },
      { status: 400 }
    );
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const source = await getContentById(sourceContentId, org.id);

  if (!source) {
    return NextResponse.json({ error: "Source content not found" }, { status: 404 });
  }

  const { brandContext, ragContext, learnings, preferences, currentState } =
    await assembleContext(
      org.id,
      source.topic || source.body.slice(0, 100),
      memoryUserId
    );

  const prompt = `You are Mo, an expert marketing content creator. Repurpose the following content for ${targetPlatform}.

## Original Content (${source.platform})
Hook: ${source.hook}
Body: ${source.body}
CTA: ${source.cta}
Hashtags: ${source.hashtags.join(", ")}
Pillar: ${source.pillar}

## Target Platform Requirements
${PLATFORM_TEMPLATES[targetPlatform]}

${brandContext ? `## Brand Context\n${brandContext}` : ""}
${ragContext ? `\n## Knowledge Base Context\n${ragContext}` : ""}
${learnings ? `\n## What We've Learned\nApply these validated insights from past performance:\n${learnings}` : ""}
${preferences ? `\n## User Preferences\nRespect these explicit preferences:\n${preferences}` : ""}
${currentState ? `\n## Current State\nBe aware of what's already scheduled and published — avoid repetition:\n${currentState}` : ""}

## Instructions
Adapt this content for ${targetPlatform} while preserving the core message and value. Adjust length, tone, formatting, and hashtags to match the target platform's best practices.

## Output Format
Respond in JSON with this exact structure (no markdown code fences):
{
  "hook": "The attention-grabbing opener",
  "body": "The main content body",
  "cta": "The call-to-action",
  "hashtags": ["#tag1", "#tag2"],
  "pillar": "${source.pillar}"
}`;

  const { text, usage } = await generateText({
    model: sonnet,
    prompt,
  });

  if (!user.isApiKeyUser && usage) {
    await recordUsage({
      userId: user.id,
      orgId: org.id,
      model: "claude-sonnet-4-5-20250929",
      route: "/api/content/repurpose",
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
      pillar: source.pillar,
    };
  }

  const item = await insertContent(org.id, {
    platform: targetPlatform,
    hook: parsed.hook,
    body: parsed.body,
    cta: parsed.cta,
    hashtags: parsed.hashtags,
    pillar: parsed.pillar || source.pillar,
    topic: source.topic ? `Repurposed: ${source.topic}` : "Repurposed content",
  });

  return NextResponse.json({ ...item, sourceContentId });
}
