import { NextResponse } from "next/server";
import { generateText } from "ai";
import { sonnet } from "@/lib/ai/providers/anthropic";
import { buildContentGenerationPrompt } from "@/lib/ai/prompts/system";
import { assembleContext } from "@/lib/rag/context";
import { requireApiKey } from "@/lib/api/auth";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { contentItems } from "@/lib/store";
import type { Platform, ContentItem } from "@/lib/store/types";

export async function POST(req: Request) {
  const authError = requireApiKey(req);
  if (authError) return authError;

  const body = await req.json();
  const { platform, topic, pillar } = body as {
    platform: Platform;
    topic: string;
    pillar?: string;
  };

  if (!platform || !topic) {
    return NextResponse.json(
      { error: "platform and topic are required" },
      { status: 400 }
    );
  }

  const org = await resolveOrgFromRequest(req, body);
  const { brandContext, ragContext } = await assembleContext(org.id, topic);
  const prompt = buildContentGenerationPrompt(
    platform,
    topic,
    pillar,
    brandContext,
    ragContext
  );

  const { text } = await generateText({
    model: sonnet,
    prompt,
  });

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

  const item: ContentItem = {
    id: crypto.randomUUID(),
    platform,
    pillar: parsed.pillar || pillar || "General",
    topic,
    hook: parsed.hook,
    body: parsed.body,
    cta: parsed.cta,
    hashtags: parsed.hashtags,
    status: "draft",
    createdAt: new Date(),
  };

  contentItems.set(item.id, item);

  return NextResponse.json(item);
}
