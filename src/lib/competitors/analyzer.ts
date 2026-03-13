import { generateText } from "ai";
import { gpt4oMini } from "@/lib/ai/providers/openai";

/**
 * Analyze competitor content using GPT-4o-mini.
 *
 * Accepts an array of scraped content items and returns a structured
 * JSON analysis object covering themes, patterns, strengths, weaknesses,
 * and opportunities.
 */
export async function analyzeCompetitorContent(
  contents: { url: string; content: string; platform?: string }[]
): Promise<Record<string, unknown>> {
  if (contents.length === 0) return {};

  const contentSummary = contents
    .map(
      (c, i) =>
        `[${i + 1}] URL: ${c.url}\nPlatform: ${c.platform ?? "web"}\nContent: ${c.content.slice(0, 2000)}`
    )
    .join("\n\n---\n\n");

  try {
    const { text } = await generateText({
      model: gpt4oMini,
      prompt: `You are an expert marketing analyst. Analyze the following competitor content.

## Scraped Content
${contentSummary}

## Instructions
Analyze this competitor content and return a JSON object (no markdown fences) with this exact structure:
{
  "themes": ["theme1", "theme2", ...],
  "postingFrequency": "description of observed posting patterns",
  "contentTypes": ["type1", "type2", ...],
  "engagementStrategies": ["strategy1", "strategy2", ...],
  "keyMessaging": ["message1", "message2", ...],
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "opportunities": ["opportunity1", "opportunity2", ...],
  "summary": "2-3 sentence overall summary"
}

Return ONLY valid JSON. No markdown, no explanation.`,
    });

    // Parse the JSON response, stripping any markdown fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return parsed;
  } catch {
    return {};
  }
}
