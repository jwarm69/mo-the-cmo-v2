import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import {
  listContent,
  getContentById,
  updateContent,
  deleteContent,
  hasContentEdits,
  describeDiff,
} from "@/lib/db/content";
import { storeLearning } from "@/lib/memory/long-term";
import type { ContentStatus, Platform } from "@/lib/types";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") as Platform | null;
  const status = searchParams.get("status") as ContentStatus | null;

  const items = await listContent(org.id, {
    platform: platform || undefined,
    status: status || undefined,
  });

  return NextResponse.json(items);
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const { id, ...updates } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Fetch original for edit detection (Phase 3)
  const original = await getContentById(id, org.id);
  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await updateContent(id, org.id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Phase 3a: detect edits and store learning
  if (hasContentEdits(original, updates)) {
    const diff = describeDiff(original, updates);
    try {
      await storeLearning(org.id, {
        insight: `User edited ${original.platform} content: ${diff}`,
        category: "content_editing",
        confidence: "medium",
        weight: 1.5,
      });
    } catch {
      // Non-critical — don't fail the update
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const org = await resolveOrgFromRequest(req, undefined, user.orgId);
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const deleted = await deleteContent(id, org.id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
