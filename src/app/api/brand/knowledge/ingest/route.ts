import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { requireAuth } from "@/lib/api/session";
import { resolveOrgFromRequest } from "@/lib/api/org";
import { ingestDocument } from "@/lib/rag/ingest";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json().catch(() => ({}));
  const org = await resolveOrgFromRequest(req, body, user.orgId);

  // Read .md files from knowledge/<org-slug>/ or knowledge/ fallback
  const orgDir = path.join(process.cwd(), "knowledge", org.slug);
  const fallbackDir = path.join(process.cwd(), "knowledge");

  let knowledgeDir: string;
  try {
    await fs.access(orgDir);
    knowledgeDir = orgDir;
  } catch {
    knowledgeDir = fallbackDir;
  }

  let files: string[] = [];
  try {
    const entries = await fs.readdir(knowledgeDir, { withFileTypes: true });
    files = entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);
  } catch {
    return NextResponse.json(
      { success: false, error: "knowledge directory not found" },
      { status: 404 }
    );
  }

  if (files.length === 0) {
    return NextResponse.json({
      success: true,
      documentCount: 0,
      totalChunks: 0,
      message: "No .md files found in knowledge directory",
    });
  }

  let totalChunks = 0;
  let documentCount = 0;

  for (const filename of files) {
    const content = await fs.readFile(
      path.join(knowledgeDir, filename),
      "utf-8"
    );
    const result = await ingestDocument(org.id, filename, content, "file");
    totalChunks += result.chunkCount;
    documentCount++;
  }

  return NextResponse.json({
    success: true,
    documentCount,
    totalChunks,
  });
}
