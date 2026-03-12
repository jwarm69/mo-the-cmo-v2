import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { captureContext } from "@/lib/brain/context-brain";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const rows = await db
    .select()
    .from(products)
    .where(eq(products.orgId, org.id))
    .orderBy(desc(products.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json();
  const {
    name,
    description,
    status,
    targetAudience,
    pricing,
    launchDate,
    uniqueValue,
    outcomes,
  } = body as {
    name?: string;
    description?: string;
    status?: string;
    targetAudience?: {
      demographics: string;
      psychographics: string;
      painPoints: string[];
      goals: string[];
    };
    pricing?: {
      amount: number;
      currency: string;
      model: string;
      description?: string;
    };
    launchDate?: string;
    uniqueValue?: string;
    outcomes?: string[];
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const [created] = await db
    .insert(products)
    .values({
      orgId: org.id,
      name: name.trim(),
      description: description || null,
      status: (status as "active") || "active",
      targetAudience: targetAudience || null,
      pricing: pricing || null,
      launchDate: launchDate ? new Date(launchDate) : null,
      uniqueValue: uniqueValue || null,
      outcomes: outcomes || null,
    })
    .returning();

  // Auto-capture into company brain
  const contextParts = [
    `Product: ${name}`,
    description ? `Description: ${description}` : null,
    uniqueValue ? `Unique Value: ${uniqueValue}` : null,
    outcomes?.length ? `Outcomes: ${outcomes.join("; ")}` : null,
    pricing ? `Pricing: ${pricing.amount} ${pricing.currency} (${pricing.model})` : null,
    targetAudience
      ? `Target: ${targetAudience.demographics}. Pain points: ${targetAudience.painPoints?.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  captureContext({
    orgId: org.id,
    type: "product_info",
    title: `Product: ${name}`,
    content: contextParts,
    source: "product_create",
    sourceId: created.id,
    confidence: 1.0,
  }).catch(() => {});

  return NextResponse.json(created, { status: 201 });
}
