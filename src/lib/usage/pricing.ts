/**
 * Cost constants: cents per 1 million tokens
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4o": { input: 250, output: 1000 },
  "gpt-4o-mini": { input: 15, output: 60 },
  "text-embedding-3-small": { input: 2, output: 0 },

  // Anthropic
  "claude-sonnet-4-5-20250929": { input: 300, output: 1500 },
  "claude-sonnet-4-20250514": { input: 300, output: 1500 },
};

/**
 * Calculate cost in cents for a given model and token usage.
 * Falls back to gpt-4o pricing for unknown models.
 */
export function calculateCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Normalize model name — strip provider prefixes like "openai:" or "anthropic:"
  const normalized = model.replace(/^(openai|anthropic):/, "");
  const pricing = MODEL_PRICING[normalized] ?? MODEL_PRICING["gpt-4o"];

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}
