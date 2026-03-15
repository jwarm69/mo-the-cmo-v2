/**
 * Sales Enablement Prompts — structured prompts for creating
 * sales assets informed by ICP, positioning, and competitive intel.
 */

export function buildBattleCardPrompt(opts: {
  product: string;
  icpContext: string;
  competitorContext: string;
  positioningContext: string;
}): string {
  return `You are Mo, the AI Go-To-Market Strategist. Create a sales battle card.

## Product
${opts.product}

## Ideal Customer Profile
${opts.icpContext || "No ICPs defined — create a general battle card."}

## Competitive Intelligence
${opts.competitorContext || "No competitor data available."}

## Positioning
${opts.positioningContext || "No positioning frameworks defined."}

## Your Task
Create a structured battle card with:
1. **Quick Pitch** — 2-3 sentence elevator pitch
2. **Target Buyer** — Who this is for and their key pain points
3. **Key Value Props** — 3-5 unique value propositions with supporting evidence
4. **Competitive Differentiators** — How we compare to alternatives (table format)
5. **Common Objections** — Top 5 objections with response frameworks
6. **Proof Points** — Testimonials, case studies, metrics that build credibility
7. **Qualifying Questions** — 5 questions to identify if a prospect is a fit
8. **Closing Triggers** — What signals readiness to buy and how to capitalize

Respond in JSON (no markdown fences):
{
  "quickPitch": "string",
  "targetBuyer": "string",
  "valueProps": [{ "prop": "string", "evidence": "string" }],
  "competitiveMatrix": [{ "dimension": "string", "us": "string", "competitor": "string" }],
  "objections": [{ "objection": "string", "response": "string" }],
  "proofPoints": ["string"],
  "qualifyingQuestions": ["string"],
  "closingTriggers": ["string"]
}`;
}

export function buildOutboundSequencePrompt(opts: {
  icpContext: string;
  product: string;
  channel: string;
  brandContext: string;
}): string {
  return `You are Mo, the AI Go-To-Market Strategist. Create a multi-step outbound sequence.

## Target ICP
${opts.icpContext || "General audience."}

## Product/Offer
${opts.product}

## Channel
${opts.channel} (e.g., email, DM, LinkedIn, cold email)

## Brand Voice
${opts.brandContext}

## Your Task
Create a 5-7 step outbound sequence. Each step should:
- Build on the previous one (don't repeat the same angle)
- Get progressively more direct/urgent
- Include a clear CTA that lowers the barrier to response
- Respect the platform's conventions and character limits

Respond in JSON (no markdown fences):
{
  "sequenceName": "string",
  "targetIcp": "string",
  "steps": [
    {
      "stepNumber": 1,
      "dayOffset": 0,
      "subject": "string (if email)",
      "body": "string",
      "cta": "string",
      "angle": "string (what hook/angle this step uses)",
      "notes": "string (delivery tips)"
    }
  ],
  "overallStrategy": "string"
}`;
}

export function buildObjectionHandlerPrompt(opts: {
  icpContext: string;
  product: string;
  positioningContext: string;
}): string {
  return `You are Mo, the AI Go-To-Market Strategist. Create an objection handling framework.

## ICP Context
${opts.icpContext || "General audience."}

## Product/Offer
${opts.product}

## Positioning
${opts.positioningContext || "No positioning defined."}

## Your Task
Create response frameworks for the top 8-10 most common objections. For each:
1. **Objection** — What the prospect says
2. **What They Really Mean** — The underlying concern
3. **Acknowledge** — How to validate their concern
4. **Reframe** — How to shift the perspective
5. **Evidence** — Proof point that addresses the concern
6. **Bridge** — How to transition back to value

Respond in JSON (no markdown fences):
{
  "objections": [
    {
      "objection": "string",
      "realMeaning": "string",
      "acknowledge": "string",
      "reframe": "string",
      "evidence": "string",
      "bridge": "string"
    }
  ]
}`;
}

export function buildOnePagerPrompt(opts: {
  product: string;
  positioningContext: string;
  icpContext: string;
  brandContext: string;
}): string {
  return `You are Mo, the AI Go-To-Market Strategist. Create a one-pager for a product/service.

## Product
${opts.product}

## Positioning
${opts.positioningContext || "No positioning defined."}

## Target ICP
${opts.icpContext || "General audience."}

## Brand Context
${opts.brandContext}

## Your Task
Create a structured one-pager that a solo entrepreneur could use as a PDF, landing page, or sales doc. Include:
1. **Headline** — Compelling, benefit-focused headline
2. **Subheadline** — Clarifying statement
3. **The Problem** — 2-3 sentences describing the pain
4. **The Solution** — What the product/service does
5. **Key Benefits** — 3-5 bullet points (outcomes, not features)
6. **How It Works** — 3-step process
7. **Social Proof** — Testimonials, results, or credibility markers
8. **Offer Details** — Pricing, what's included
9. **CTA** — Clear call-to-action with urgency

Respond in JSON (no markdown fences):
{
  "headline": "string",
  "subheadline": "string",
  "problem": "string",
  "solution": "string",
  "benefits": ["string"],
  "howItWorks": [{ "step": 1, "title": "string", "description": "string" }],
  "socialProof": ["string"],
  "offerDetails": "string",
  "cta": "string"
}`;
}
