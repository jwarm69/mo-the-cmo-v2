import { NextResponse } from "next/server";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { requireApiKey } from "@/lib/api/auth";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { assembleContext } from "@/lib/rag/context";
import { orchestrate } from "@/lib/ai/orchestrator";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authError = requireApiKey(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as { messages?: UIMessage[]; orgSlug?: string };
    const messages = body.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 }
      );
    }

    const org = await resolveOrgFromRequest(req, body);

    const lastMessage = messages[messages.length - 1];
    const lastText =
      lastMessage?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") || "";

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
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
