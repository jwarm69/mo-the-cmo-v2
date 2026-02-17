import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { chunkText } from "@/lib/rag/ingest";

export async function GET() {
  const knowledgeDir = path.join(process.cwd(), "knowledge");

  let files: string[] = [];
  try {
    const entries = await fs.readdir(knowledgeDir, { withFileTypes: true });
    files = entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);
  } catch {
    return NextResponse.json({
      initialized: false,
      documentCount: 0,
      totalChunks: 0,
      documents: [],
    });
  }

  let totalChunks = 0;
  const documents = await Promise.all(
    files.map(async (filename) => {
      const content = await fs.readFile(
        path.join(knowledgeDir, filename),
        "utf-8"
      );
      const chunks = chunkText(content, { chunkSize: 1200, chunkOverlap: 150 });
      totalChunks += chunks.length;
      return {
        id: filename,
        title: filename.replace(/\.md$/, ""),
        sourceType: "file",
        chunkCount: chunks.length,
        createdAt: new Date().toISOString(),
      };
    })
  );

  return NextResponse.json({
    initialized: true,
    documentCount: documents.length,
    totalChunks,
    documents,
  });
}
