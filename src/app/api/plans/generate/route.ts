import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { generateText } from "ai";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import {
  marketingPlans,
  marketingGoals,
  products,
  tactics as tacticsTable,
} from "@/lib/db/schema";
import { assembleContext } from "@/lib/rag/context";
import { searchBrain, formatBrainContext, captureContext } from "@/lib/brain/context-brain";
import { gpt4o } from "@/lib/ai/providers/openai";
import { recordUsage } from "@/lib/usage/tracker";
import {
  buildQuarterlyPlanningPrompt,
  buildMonthlyPlanningPrompt,
  buildLaunchPlanningPrompt,
  buildIdeationPrompt,
} from "@/lib/ai/prompts/planning";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const { type, productId, goalId, startDate, endDate, focus, constraints } =
    body as {
      type: "quarterly" | "monthly" | "weekly" | "launch" | "ideation";
      productId?: string;
      goalId?: string;
      startDate?: string;
      endDate?: string;
      focus?: string;
      constraints?: string;
      quarterlyPlanId?: string;
    };

  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const memoryUserId = user.isApiKeyUser ? undefined : user.id;

  // Gather all context in parallel
  const queryHint = focus || type;
  const [assembled, brainResults, productRows, goalRows] = await Promise.all([
    assembleContext(org.id, queryHint, memoryUserId),
    searchBrain(org.id, queryHint, 10),
    db
      .select()
      .from(products)
      .where(
        productId
          ? and(eq(products.orgId, org.id), eq(products.id, productId))
          : eq(products.orgId, org.id)
      )
      .orderBy(desc(products.createdAt)),
    db
      .select()
      .from(marketingGoals)
      .where(
        goalId
          ? and(eq(marketingGoals.orgId, org.id), eq(marketingGoals.id, goalId))
          : and(
              eq(marketingGoals.orgId, org.id),
              inArray(marketingGoals.status, ["not_started", "in_progress", "on_track"])
            )
      )
      .orderBy(desc(marketingGoals.createdAt)),
  ]);

  const brainContext = formatBrainContext(brainResults);
  const productsStr = productRows
    .map(
      (p) =>
        `- ${p.name} (${p.status}): ${p.description || "No description"}${p.uniqueValue ? ` | Value prop: ${p.uniqueValue}` : ""}${p.outcomes?.length ? ` | Outcomes: ${p.outcomes.join(", ")}` : ""}`
    )
    .join("\n");
  const goalsStr = goalRows
    .map(
      (g) =>
        `- ${g.title} (${g.timeframe}, ${g.status})${g.targetMetric ? ` | Target: ${g.targetValue} ${g.targetMetric}` : ""}${g.currentValue ? ` | Current: ${g.currentValue}` : ""}`
    )
    .join("\n");

  let prompt: string;
  let planTitle: string;

  const sDate = startDate || new Date().toISOString().split("T")[0];
  const eDate =
    endDate ||
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

  switch (type) {
    case "quarterly": {
      const quarter = getQuarterLabel(new Date(sDate));
      planTitle = `${quarter} Marketing Plan`;
      prompt = buildQuarterlyPlanningPrompt({
        brandContext: assembled.brandContext,
        brainContext,
        products: productsStr,
        currentGoals: goalsStr,
        currentState: assembled.currentState,
        quarterLabel: quarter,
        startDate: sDate,
        endDate: eDate,
      });
      break;
    }
    case "monthly": {
      // Load parent quarterly plan if it exists
      let quarterlyPlan = "";
      if (body.quarterlyPlanId) {
        const [qp] = await db
          .select()
          .from(marketingPlans)
          .where(eq(marketingPlans.id, body.quarterlyPlanId))
          .limit(1);
        if (qp) {
          quarterlyPlan = `Theme: ${qp.theme}\nStrategy: ${qp.strategy}\nKey Messages: ${(qp.keyMessages as string[] | null)?.join("; ") || "none"}`;
        }
      }
      const monthLabel = getMonthLabel(new Date(sDate));
      planTitle = `${monthLabel} Marketing Plan`;
      prompt = buildMonthlyPlanningPrompt({
        brandContext: assembled.brandContext,
        brainContext,
        products: productsStr,
        currentGoals: goalsStr,
        currentState: assembled.currentState,
        quarterlyPlan,
        monthLabel,
        startDate: sDate,
        endDate: eDate,
      });
      break;
    }
    case "launch": {
      const product = productRows[0];
      if (!product) {
        return NextResponse.json(
          { error: "Product not found. Create a product first." },
          { status: 400 }
        );
      }
      const launchDate = product.launchDate
        ? new Date(product.launchDate)
        : new Date(sDate);
      const weeksUntil = Math.max(
        1,
        Math.ceil(
          (launchDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
        )
      );
      planTitle = `Launch Plan: ${product.name}`;
      prompt = buildLaunchPlanningPrompt({
        brandContext: assembled.brandContext,
        brainContext,
        product: `${product.name}: ${product.description || "No description"}${product.uniqueValue ? `\nValue prop: ${product.uniqueValue}` : ""}${product.outcomes?.length ? `\nOutcomes: ${product.outcomes.join(", ")}` : ""}${product.pricing ? `\nPricing: ${product.pricing.amount} ${product.pricing.currency} (${product.pricing.model})` : ""}`,
        launchDate: launchDate.toISOString().split("T")[0],
        currentState: assembled.currentState,
        currentGoals: goalsStr,
        weeksUntilLaunch: weeksUntil,
      });
      break;
    }
    case "ideation": {
      planTitle = `Ideation: ${focus || "General"}`;
      prompt = buildIdeationPrompt({
        brandContext: assembled.brandContext,
        brainContext,
        products: productsStr,
        focus: focus || "Generate creative marketing ideas across all channels",
        constraints: constraints || "",
        currentState: assembled.currentState,
      });
      break;
    }
    default:
      return NextResponse.json(
        { error: `Unsupported plan type: ${type}` },
        { status: 400 }
      );
  }

  // Generate the plan
  const result = await generateText({
    model: gpt4o,
    prompt,
    maxTokens: 4000,
  });

  // Record usage
  if (!user.isApiKeyUser && result.usage) {
    await recordUsage({
      userId: user.id,
      orgId: org.id,
      model: "gpt-4o",
      route: "/api/plans/generate",
      inputTokens: result.usage.promptTokens ?? 0,
      outputTokens: result.usage.completionTokens ?? 0,
    }).catch(() => {});
  }

  // Parse the AI response
  let planData: Record<string, unknown>;
  try {
    planData = JSON.parse(result.text);
  } catch {
    return NextResponse.json(
      {
        error: "Failed to parse plan. Raw output returned.",
        raw: result.text,
      },
      { status: 500 }
    );
  }

  // For non-ideation types, save the plan and tactics to the database
  if (type !== "ideation") {
    const [savedPlan] = await db
      .insert(marketingPlans)
      .values({
        orgId: org.id,
        type: type as "quarterly",
        title: planTitle,
        theme:
          (planData.quarterTheme as string) ||
          (planData.monthTheme as string) ||
          (planData.launchTheme as string) ||
          null,
        summary:
          (planData.channelStrategy as string) ||
          (planData.summary as string) ||
          null,
        strategy: JSON.stringify(planData),
        status: "draft",
        startDate: new Date(sDate),
        endDate: new Date(eDate),
        goalId: goalId || null,
        productId: productId || null,
        channelMix: extractChannelMix(planData),
        keyMessages:
          (planData.keyMessages as string[]) ||
          (planData.successMetrics as string[]) ||
          null,
      })
      .returning();

    // Extract and save tactics
    const tacticInputs = extractTactics(planData, org.id, savedPlan.id, sDate);
    if (tacticInputs.length > 0) {
      await db.insert(tacticsTable).values(tacticInputs);
    }

    // Capture plan into company brain
    captureContext({
      orgId: org.id,
      type: "plan_context",
      title: planTitle,
      content: `${type} plan: ${(planData.quarterTheme as string) || (planData.monthTheme as string) || planTitle}. Strategy: ${(planData.channelStrategy as string) || (planData.summary as string) || "See full plan"}. Key messages: ${((planData.keyMessages as string[]) || []).join("; ")}`,
      source: "plan_generation",
      sourceId: savedPlan.id,
      confidence: 1.0,
    }).catch(() => {});

    return NextResponse.json({
      plan: savedPlan,
      details: planData,
      tacticsCount: tacticInputs.length,
    });
  }

  // For ideation, just return the ideas
  return NextResponse.json({ ideas: planData });
}

function getQuarterLabel(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${q} ${date.getFullYear()}`;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function extractChannelMix(
  planData: Record<string, unknown>
): { channel: string; weight: number; rationale: string }[] | null {
  // Try to extract from monthly breakdowns or top-level
  const months = planData.months as
    | { channelMix?: { channel: string; weight: number; rationale: string }[] }[]
    | undefined;

  if (months?.[0]?.channelMix) {
    return months[0].channelMix;
  }

  return null;
}

function extractTactics(
  planData: Record<string, unknown>,
  orgId: string,
  planId: string,
  baseDate: string
): {
  orgId: string;
  planId: string;
  channel: string;
  channelCategory: string;
  title: string;
  description: string | null;
  status: "planned";
  scheduledDate: Date | null;
  effort: string | null;
  expectedOutcome: string | null;
}[] {
  const results: ReturnType<typeof extractTactics> = [];
  const base = new Date(baseDate);

  interface TacticData {
    channel?: string;
    channelCategory?: string;
    title?: string;
    description?: string;
    effort?: string;
    expectedOutcome?: string;
    week?: number;
    dayOfWeek?: string;
  }

  // Extract from quarterly plan months
  const months = planData.months as { tactics?: TacticData[] }[] | undefined;
  if (months) {
    for (let mi = 0; mi < months.length; mi++) {
      const month = months[mi];
      if (!month.tactics) continue;
      for (const t of month.tactics) {
        if (!t.title || !t.channel) continue;
        const weekOffset = (mi * 4 + (t.week || 1) - 1) * 7;
        results.push({
          orgId,
          planId,
          channel: t.channel,
          channelCategory: t.channelCategory || "digital",
          title: t.title,
          description: t.description || null,
          status: "planned",
          scheduledDate: new Date(base.getTime() + weekOffset * 86400000),
          effort: t.effort || null,
          expectedOutcome: t.expectedOutcome || null,
        });
      }
    }
  }

  // Extract from monthly plan weeks
  const weeks = planData.weeks as { weekNumber?: number; tactics?: TacticData[] }[] | undefined;
  if (weeks) {
    for (const week of weeks) {
      if (!week.tactics) continue;
      for (const t of week.tactics) {
        if (!t.title || !t.channel) continue;
        const weekOffset = ((week.weekNumber || 1) - 1) * 7;
        const dayMap: Record<string, number> = {
          monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
          friday: 4, saturday: 5, sunday: 6,
        };
        const dayOffset = t.dayOfWeek ? dayMap[t.dayOfWeek.toLowerCase()] || 0 : 0;
        results.push({
          orgId,
          planId,
          channel: t.channel,
          channelCategory: t.channelCategory || "digital",
          title: t.title,
          description: t.description || null,
          status: "planned",
          scheduledDate: new Date(
            base.getTime() + (weekOffset + dayOffset) * 86400000
          ),
          effort: t.effort || null,
          expectedOutcome: t.expectedOutcome || null,
        });
      }
    }
  }

  // Extract from launch plan phases
  const phases = planData.phases as { tactics?: TacticData[]; startWeek?: number }[] | undefined;
  if (phases) {
    for (const phase of phases) {
      if (!phase.tactics) continue;
      for (const t of phase.tactics) {
        if (!t.title || !t.channel) continue;
        const weekOffset = ((phase.startWeek || 1) - 1) * 7;
        results.push({
          orgId,
          planId,
          channel: t.channel,
          channelCategory: t.channelCategory || "digital",
          title: t.title,
          description: t.description || null,
          status: "planned",
          scheduledDate: new Date(base.getTime() + weekOffset * 86400000),
          effort: t.effort || null,
          expectedOutcome: t.expectedOutcome || null,
        });
      }
    }
  }

  return results;
}
