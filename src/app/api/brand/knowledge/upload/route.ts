import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { requireApiKey } from "@/lib/api/auth";
import { parseFile } from "@/lib/knowledge/parsers";
import { chunkText } from "@/lib/rag/ingest";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set(["md", "txt", "pdf", "docx"]);

function sanitizeFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  const authError = requireApiKey(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();

    const orgSlug =
      (formData.get("orgSlug") as string) ||
      process.env.DEFAULT_ORG_SLUG ||
      "default-org";

    const files = formData.getAll("files") as File[];
    const pastedText = formData.get("pastedText") as string | null;

    if (files.length === 0 && !pastedText?.trim()) {
      return NextResponse.json(
        { error: "No files or pasted text provided" },
        { status: 400 }
      );
    }

    const knowledgeDir = path.join(process.cwd(), "knowledge");
    await fs.mkdir(knowledgeDir, { recursive: true });

    const results: { name: string; originalName: string; chunks: number }[] = [];

    for (const file of files) {
      const ext = file.name.toLowerCase().split(".").pop();
      if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.name}. Allowed: .md, .txt, .pdf, .docx` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const text = await parseFile(buffer, file.name);

      const sanitized = sanitizeFilename(file.name);
      const outputName = `${orgSlug}-${sanitized}.md`;
      await fs.writeFile(path.join(knowledgeDir, outputName), text, "utf-8");

      const chunks = chunkText(text, { chunkSize: 1200, chunkOverlap: 150 });
      results.push({
        name: outputName,
        originalName: file.name,
        chunks: chunks.length,
      });
    }

    if (pastedText?.trim()) {
      const outputName = `${orgSlug}-custom-context.md`;
      await fs.writeFile(
        path.join(knowledgeDir, outputName),
        pastedText.trim(),
        "utf-8"
      );

      const chunks = chunkText(pastedText.trim(), {
        chunkSize: 1200,
        chunkOverlap: 150,
      });
      results.push({
        name: outputName,
        originalName: "pasted-text",
        chunks: chunks.length,
      });
    }

    return NextResponse.json({ success: true, files: results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
