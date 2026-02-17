import { NextResponse } from "next/server";
import { contentItems } from "@/lib/store";
import type { ContentStatus, Platform } from "@/lib/store/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") as Platform | null;
  const status = searchParams.get("status") as ContentStatus | null;

  let items = Array.from(contentItems.values());

  if (platform) {
    items = items.filter((i) => i.platform === platform);
  }
  if (status) {
    items = items.filter((i) => i.status === status);
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json(items);
}

export async function PUT(req: Request) {
  const { id, ...updates } = await req.json();

  const item = contentItems.get(id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = { ...item, ...updates };
  contentItems.set(id, updated);

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!contentItems.has(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  contentItems.delete(id);
  return NextResponse.json({ success: true });
}
