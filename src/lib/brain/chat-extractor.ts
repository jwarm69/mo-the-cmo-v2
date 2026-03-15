/**
 * Chat Context Extractor — automatically pulls structured knowledge
 * from user messages in chat and captures it into the company brain.
 *
 * This runs on every chat message, looking for business-relevant info
 * that should be remembered: product details, audience insights,
 * strategic decisions, market intel, etc.
 */

import { generateText } from "ai";
import { gpt4oMini } from "@/lib/ai/providers/openai";
import { captureContextBatch, type CaptureInput, type ContextType } from "./context-brain";

interface ExtractedContext {
  type: ContextType;
  title: string;
  content: string;
}

const EXTRACTION_PROMPT = `You are a context extraction engine for a marketing AI assistant.
Analyze the user's message and extract any business-relevant information that should be remembered for future marketing decisions.

Extract ONLY substantive information. Skip greetings, small talk, and vague requests.

Categories to extract:
- business_info: Facts about their business (location, niche, story, team size, years in business)
- product_info: Details about their products/services (features, pricing, outcomes, target market)
- audience_insight: Who their customers are, what motivates them, objections they face
- strategy_decision: Strategic choices they've made or want to make (positioning, channels, messaging)
- market_insight: Competitive info, trends they mention, opportunities they see
- brand_voice: How they want to sound, examples of tone they like/dislike, corrections to AI output
- goal_context: Goals, targets, timelines, priorities they mention
- icp_insight: Details about ideal customers — demographics, psychographics, pain points, buying triggers, objections
- positioning_insight: Value propositions, positioning statements, messaging angles, competitive differentiation
- channel_insight: Which marketing channels work, don't work, are being considered, or have been tried with results

Return a JSON array of extracted items. If nothing substantive is found, return an empty array [].

Format:
[
  {
    "type": "business_info",
    "title": "Short descriptive label",
    "content": "The actual information to remember"
  }
]

Be concise but complete. Capture the essence of what was said.`;

/**
 * Extract context from a user's chat message and store it in the brain.
 * Runs asynchronously — never blocks the chat response.
 */
export async function extractAndCaptureFromChat(
  orgId: string,
  userMessage: string,
  userId?: string
): Promise<void> {
  // Skip very short messages — unlikely to contain extractable context
  if (userMessage.length < 30) return;

  // Skip messages that are just commands or requests
  const lowerMsg = userMessage.toLowerCase();
  if (
    lowerMsg.startsWith("write ") ||
    lowerMsg.startsWith("create ") ||
    lowerMsg.startsWith("generate ") ||
    lowerMsg.startsWith("make ") ||
    lowerMsg.match(/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure)\b/)
  ) {
    // These might still contain context, but check if they're long enough
    if (userMessage.length < 80) return;
  }

  try {
    const { text } = await generateText({
      model: gpt4oMini,
      system: EXTRACTION_PROMPT,
      prompt: `User message:\n${userMessage}`,
      maxOutputTokens: 500,
    });

    let extracted: ExtractedContext[];
    try {
      extracted = JSON.parse(text);
    } catch {
      return; // Failed to parse — skip silently
    }

    if (!Array.isArray(extracted) || extracted.length === 0) return;

    const inputs: CaptureInput[] = extracted
      .filter(
        (item) =>
          item.type &&
          item.title &&
          item.content &&
          item.content.length > 10
      )
      .map((item) => ({
        orgId,
        userId,
        type: item.type,
        title: item.title,
        content: item.content,
        source: "chat",
        confidence: 0.8, // Slightly lower — extracted, not explicit
      }));

    if (inputs.length > 0) {
      await captureContextBatch(inputs);
    }
  } catch {
    // Non-critical — chat continues regardless
  }
}
