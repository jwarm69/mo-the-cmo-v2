import { NextResponse } from "next/server";
import { generateText } from "ai";
import { gpt4oMini } from "@/lib/ai/providers/openai";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { assembleContext } from "@/lib/rag/context";
import { captureContext } from "@/lib/brain/context-brain";
import { buildWeeklyBriefPrompt } from "@/lib/ai/prompts/planning";
import { checkUsageLimit, recordUsage } from "@/lib/usage/tracker";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const memoryUserId = user.isApiKeyUser ? undefined : user.id;

  if (!user.isApiKeyUser) {
    const usage = await checkUsageLimit(user.id, user.usageLimitCents);
    if (!usage.allowed) {
      return NextResponse.json({ error: "Usage limit reached" }, { status: 429 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const context = await assembleContext(org.id, "weekly marketing brief", memoryUserId);

  const prompt = buildWeeklyBriefPrompt({
    brandContext: context.brandContext,
    currentState: context.currentState,
    learnings: context.learnings,
    goalsContext: context.goalsContext,
    plansContext: context.plansContext,
    productsContext: context.productsContext,
    brainContext: context.brainContext,
  });

  const { text, usage } = await generateText({
    model: gpt4oMini,
    prompt,
  });

  if (!user.isApiKeyUser && usage) {
    await recordUsage({
      userId: user.id,
      orgId: org.id,
      model: "gpt-4o-mini",
      route: "/api/brief/weekly",
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    });
  }

  let brief;
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    brief = JSON.parse(cleaned);
  } catch {
    brief = { summary: text, priorities: [], pillarHealth: [], goalProgress: [] };
  }

  // Store as performance_insight
  try {
    await captureContext({
      orgId: org.id,
      userId: memoryUserId,
      type: "performance_insight",
      title: `Weekly Brief — ${new Date().toISOString().split("T")[0]}`,
      content: typeof brief.summary === "string" ? brief.summary : JSON.stringify(brief),
      source: "weekly_brief",
      confidence: 0.9,
    });
  } catch {
    // Non-critical
  }

  return NextResponse.json(brief);
}
