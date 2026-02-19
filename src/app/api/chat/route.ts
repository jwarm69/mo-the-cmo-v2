import { NextResponse } from "next/server";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { assembleContext } from "@/lib/rag/context";
import { orchestrate } from "@/lib/ai/orchestrator";
import { checkUsageLimit, recordUsage } from "@/lib/usage/tracker";
import { storeLearning } from "@/lib/memory/long-term";

export const runtime = "nodejs";

const CORRECTION_PATTERNS = [
  /\bactually\b/i,
  /^no[,.\s]/i,
  /\bwrong\b/i,
  /\binstead\b/i,
  /\bdon'?t\b/i,
  /\bnever\b/i,
  /\balways\b/i,
  /\bremember\b/i,
];

const MEMORY_PATTERN = /^(?:remember|note|learn)\s*[:.]?\s+(.+)/i;

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    // Pre-check usage limit
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

    const body = (await req.json()) as { messages?: UIMessage[]; orgSlug?: string };
    const messages = body.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 }
      );
    }

    const org = await resolveOrgFromRequest(req, body, user.orgId);

    const lastMessage = messages[messages.length - 1];
    const lastText =
      lastMessage?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") || "";

    // Phase 3c: Explicit memory commands — store before chat so Mo's context includes it
    const memoryMatch = lastText.match(MEMORY_PATTERN);
    if (memoryMatch) {
      try {
        await storeLearning(org.id, {
          insight: memoryMatch[1].trim(),
          category: "explicit_preference",
          confidence: "high",
          weight: 3.0,
        });
      } catch {
        // Non-critical
      }
    }

    const assembled = await assembleContext(org.id, lastText);
    const { model, systemPrompt } = await orchestrate(lastText, {
      brandProfile: assembled.brandContext,
      ragContext: assembled.ragContext,
      learnings: assembled.learnings,
      preferences: assembled.preferences,
    });

    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      onFinish: async ({ usage, response }) => {
        if (!user.isApiKeyUser && usage) {
          await recordUsage({
            userId: user.id,
            orgId: org.id,
            model: response.modelId ?? "unknown",
            route: "/api/chat",
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
          });
        }

        // Phase 3b: Correction detection
        if (
          !memoryMatch &&
          lastMessage?.role === "user" &&
          CORRECTION_PATTERNS.some((p) => p.test(lastText))
        ) {
          try {
            await storeLearning(org.id, {
              insight: lastText,
              category: "user_correction",
              confidence: "medium",
              weight: 2.0,
            });
          } catch {
            // Non-critical
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
