import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { generateText } from "ai";
import { gpt4oMini } from "@/lib/ai/providers/openai";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { db } from "@/lib/db/client";
import { contentTemplates, contentItems } from "@/lib/db/schema";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const org = await resolveOrgFromRequest(req, undefined, user.orgId);

  const templates = await db
    .select()
    .from(contentTemplates)
    .where(eq(contentTemplates.orgId, org.id))
    .orderBy(desc(contentTemplates.usageCount));

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  const { action } = body as { action: string };

  // ── Extract template from existing content item ──────────────────
  if (action === "extract") {
    const { contentId } = body as { contentId: string };
    if (!contentId) {
      return NextResponse.json(
        { error: "contentId is required for extract action" },
        { status: 400 }
      );
    }

    const [content] = await db
      .select()
      .from(contentItems)
      .where(
        and(eq(contentItems.id, contentId), eq(contentItems.orgId, org.id))
      )
      .limit(1);

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    const contentText = [content.title, content.body]
      .filter(Boolean)
      .join("\n\n");

    const { text } = await generateText({
      model: gpt4oMini,
      prompt: `Analyze this content and extract a reusable template structure.

Content:
${contentText}

Extract the structural pattern (not the specific content) and return JSON:
{
  "name": "Short descriptive name for the template",
  "hook_type": "Type of hook used (question, statistic, bold claim, story opener, etc.)",
  "body_format": "Structure of the body (listicle, narrative, problem-solution, tips, etc.)",
  "cta_pattern": "Pattern of the CTA (question, command, link, etc.)",
  "example": "A brief example showing the template structure with placeholders"
}

Return only valid JSON, no markdown fences.`,
    });

    let extracted: {
      name?: string;
      hook_type?: string;
      body_format?: string;
      cta_pattern?: string;
      example?: string;
    };
    try {
      extracted = JSON.parse(
        text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      );
    } catch {
      return NextResponse.json(
        { error: "Failed to extract template" },
        { status: 500 }
      );
    }

    const [created] = await db
      .insert(contentTemplates)
      .values({
        orgId: org.id,
        name: extracted.name || "Extracted Template",
        platform: content.platform,
        structure: {
          hook_type: extracted.hook_type || "",
          body_format: extracted.body_format || "",
          cta_pattern: extracted.cta_pattern || "",
          example: extracted.example || "",
        },
        pillar: null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  }

  // ── Manual template creation ─────────────────────────────────────
  if (action === "create" || !action) {
    const { name, platform, structure, pillar } = body as {
      name?: string;
      platform?: string;
      structure?: {
        hook_type: string;
        body_format: string;
        cta_pattern: string;
        example: string;
      };
      pillar?: string;
    };

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(contentTemplates)
      .values({
        orgId: org.id,
        name,
        platform: platform as
          | "tiktok"
          | "instagram"
          | "twitter"
          | "facebook"
          | "linkedin"
          | "email"
          | "blog"
          | undefined,
        structure: structure || null,
        pillar: pillar || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;
  const body = await req.json();
  const org = await resolveOrgFromRequest(req, body, user.orgId);
  const { templateId } = body as { templateId: string };

  if (!templateId) {
    return NextResponse.json(
      { error: "templateId is required" },
      { status: 400 }
    );
  }

  const result = await db
    .delete(contentTemplates)
    .where(
      and(
        eq(contentTemplates.id, templateId),
        eq(contentTemplates.orgId, org.id)
      )
    )
    .returning({ id: contentTemplates.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
