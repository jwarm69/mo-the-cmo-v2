import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { generateText } from "ai";
import { requireApiKey } from "@/lib/api/auth";
import { routeTask } from "@/lib/ai/model-router";

export const runtime = "nodejs";

interface BrandContext {
  name?: string;
  voice?: string;
  tone?: string;
  targetAudience?: string;
  messagingPillars?: string[];
  contentPillars?: string[];
}

const CATEGORIES = [
  {
    key: "user-angles-copy-frameworks",
    title: "User Angles & Copy Frameworks",
    description:
      "Customer segments, emotional triggers, hooks, headlines, and copy frameworks",
  },
  {
    key: "email-lifecycle-sequences",
    title: "Email/Lifecycle Sequences",
    description:
      "Onboarding flows, win-back campaigns, retention emails, and drip sequences",
  },
  {
    key: "content-series-video-formats",
    title: "Content Series & Video Formats",
    description:
      "Recurring content formats, series concepts, production workflows, and video templates",
  },
  {
    key: "channel-strategy-calendar",
    title: "Channel Strategy & Calendar",
    description:
      "Platform-specific tactics, posting schedules, weekly/monthly calendars, and campaign hooks",
  },
] as const;

function buildBrandContextBlock(brandContext: BrandContext): string {
  const parts: string[] = [];
  if (brandContext.name) parts.push(`Brand Name: ${brandContext.name}`);
  if (brandContext.voice) parts.push(`Voice: ${brandContext.voice}`);
  if (brandContext.tone) parts.push(`Tone: ${brandContext.tone}`);
  if (brandContext.targetAudience)
    parts.push(`Target Audience: ${brandContext.targetAudience}`);
  if (brandContext.messagingPillars?.length)
    parts.push(`Messaging Pillars: ${brandContext.messagingPillars.join(", ")}`);
  if (brandContext.contentPillars?.length)
    parts.push(`Content Pillars: ${brandContext.contentPillars.join(", ")}`);

  return parts.length > 0
    ? `## Brand Context\n${parts.join("\n")}\n`
    : "";
}

export async function POST(req: Request) {
  const authError = requireApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const orgSlug =
      body.orgSlug || process.env.DEFAULT_ORG_SLUG || "default-org";
    const brandContext: BrandContext = body.brandContext || {};

    const knowledgeDir = path.join(process.cwd(), "knowledge");

    let entries: string[];
    try {
      const dirEntries = await fs.readdir(knowledgeDir, {
        withFileTypes: true,
      });
      entries = dirEntries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => e.name);
    } catch {
      return NextResponse.json(
        { error: "No knowledge documents found. Upload files first." },
        { status: 404 }
      );
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No knowledge documents found. Upload files first." },
        { status: 404 }
      );
    }

    const documents: string[] = [];
    for (const filename of entries) {
      const content = await fs.readFile(
        path.join(knowledgeDir, filename),
        "utf-8"
      );
      if (content.trim()) {
        documents.push(`--- ${filename} ---\n${content}`);
      }
    }

    const combinedText = documents.join("\n\n");
    const brandBlock = buildBrandContextBlock(brandContext);
    const model = routeTask("analysis");

    const distilled: { category: string; filename: string; summary: string }[] =
      [];

    for (const category of CATEGORIES) {
      const prompt = `You are a senior marketing strategist analyzing brand documents to extract actionable marketing knowledge.

${brandBlock}
## Task
Analyze the following documents and extract all content relevant to: **${category.title}**

Focus on: ${category.description}

If there is no relevant content for this category, respond with exactly: NO_RELEVANT_CONTENT

Otherwise, produce a well-structured Markdown document with clear headings, bullet points, and actionable insights. Include specific examples, frameworks, and templates found in the source material.

## Source Documents
${combinedText}`;

      const { text } = await generateText({ model, prompt });

      if (text.trim() === "NO_RELEVANT_CONTENT") {
        continue;
      }

      const filename = `${orgSlug}-${category.key}.md`;
      await fs.writeFile(path.join(knowledgeDir, filename), text, "utf-8");

      const summaryPrompt = `Summarize the following marketing knowledge document in one sentence (max 20 words):\n\n${text.slice(0, 2000)}`;
      const { text: summary } = await generateText({
        model,
        prompt: summaryPrompt,
      });

      distilled.push({
        category: category.title,
        filename,
        summary: summary.trim(),
      });
    }

    return NextResponse.json({ success: true, distilled });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Distillation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
