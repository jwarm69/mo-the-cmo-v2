import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * POST /api/brain/assist
 * AI-assisted brain entry generation.
 * Body: { category: string, answers: string[], brandContext?: string }
 * Returns: { entries: Array<{ type, title, content, metadata }> }
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const { category, answers, brandContext } = body as {
    category: string;
    answers: string[];
    brandContext?: string;
  };

  if (!category || !answers?.length) {
    return NextResponse.json(
      { error: "category and answers required" },
      { status: 400 }
    );
  }

  const categoryPrompts: Record<string, { types: string[]; systemNote: string }> = {
    audience: {
      types: ["audience_insight", "icp_insight"],
      systemNote:
        "Generate customer profile entries. Each entry should capture a distinct ICP segment with demographics, psychographics, pain points, motivations, and preferred channels.",
    },
    competitors: {
      types: ["market_insight"],
      systemNote:
        "Generate competitor analysis entries. Each entry should capture a competitor with their type (direct/indirect/aspirational), strengths, weaknesses, positioning, and pricing model.",
    },
    channels: {
      types: ["channel_insight", "strategy_decision"],
      systemNote:
        "Generate marketing channel entries. Each should capture a channel with its type, target audience, posting frequency, key metrics, and strategic rationale.",
    },
    content_plans: {
      types: ["plan_context"],
      systemNote:
        "Generate content series entries. Each should capture a recurring content format with its hook, goal, frequency, and target audience.",
    },
    products: {
      types: ["product_info"],
      systemNote:
        "Generate product/service entries. Each should capture a product with features, pricing, target audience, unique value, and key outcomes.",
    },
  };

  const config = categoryPrompts[category];
  if (!config) {
    return NextResponse.json(
      { error: `Unknown category: ${category}` },
      { status: 400 }
    );
  }

  const prompt = `You are Mo, an AI marketing strategist helping a user build their company's marketing brain.

${config.systemNote}

${brandContext ? `Brand context: ${brandContext}` : ""}

The user answered these questions about their ${category}:
${answers.map((a, i) => `Q${i + 1}: ${a}`).join("\n")}

Based on their answers, generate structured brain entries. Return valid JSON only:
{
  "entries": [
    {
      "type": "${config.types[0]}",
      "title": "Short descriptive title",
      "content": "Detailed knowledge about this entry that will help Mo generate better marketing content",
      "metadata": { ...any structured fields relevant to this category }
    }
  ]
}

Generate as many distinct entries as the user's answers support (typically 1-5). Be specific, not generic.`;

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.7,
    });

    const parsed = JSON.parse(result.text);

    return NextResponse.json({
      entries: parsed.entries ?? [],
      orgId: org.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
