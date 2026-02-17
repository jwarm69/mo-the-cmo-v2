import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { chunkText } from "@/lib/rag/ingest";

export async function POST() {
  const knowledgeDir = path.join(process.cwd(), "knowledge");

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

  let totalChunks = 0;
  for (const filename of files) {
    const content = await fs.readFile(
      path.join(knowledgeDir, filename),
      "utf-8"
    );
    totalChunks += chunkText(content, { chunkSize: 1200, chunkOverlap: 150 }).length;
  }

  return NextResponse.json({
    success: true,
    documentCount: files.length,
    totalChunks,
  });
}
