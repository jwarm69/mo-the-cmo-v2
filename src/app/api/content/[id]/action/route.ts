import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { updateContent } from "@/lib/db/content";
import type { ContentStatus } from "@/lib/types";

type ContentAction = "approve" | "schedule" | "publish" | "archive";

function nextDayAtNoon(): { scheduledDate: string; scheduledTime: string } {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const scheduledDate = date.toISOString().split("T")[0];
  return { scheduledDate, scheduledTime: "12:00" };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json().catch(() => ({}));
  const action = body?.action as ContentAction | undefined;
  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "content id is required" }, { status: 400 });
  }

  const org = await resolveOrgFromRequest(req, body, user.orgId);

  let status: ContentStatus;
  const updates: {
    status: ContentStatus;
    scheduledDate?: string;
    scheduledTime?: string;
  } = { status: "approved" };

  switch (action) {
    case "approve":
      status = "approved";
      break;
    case "publish":
      status = "published";
      break;
    case "archive":
      status = "archived";
      break;
    case "schedule": {
      status = "scheduled";
      const scheduledDate = body?.scheduledDate as string | undefined;
      const scheduledTime = body?.scheduledTime as string | undefined;
      if (scheduledDate && scheduledTime) {
        updates.scheduledDate = scheduledDate;
        updates.scheduledTime = scheduledTime;
      } else {
        const fallback = nextDayAtNoon();
        updates.scheduledDate = fallback.scheduledDate;
        updates.scheduledTime = fallback.scheduledTime;
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  updates.status = status;
  const updated = await updateContent(id, org.id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
