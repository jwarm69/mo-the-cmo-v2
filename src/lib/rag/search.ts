/**
 * RAG semantic search.
 * Uses lexical ranking over markdown knowledge files.
 */

import path from "path";
import { promises as fs } from "fs";
import { chunkText } from "./ingest";

export interface SearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  documentTitle: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
}

function scoreChunk(queryTokens: string[], content: string, title: string): number {
  const lowerContent = content.toLowerCase();
  const lowerTitle = title.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (lowerContent.includes(token)) score += 1;
    if (lowerTitle.includes(token)) score += 2;
  }

  return score;
}

async function loadMarkdownFiles(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(directory, entry.name));
  } catch {
    return [];
  }
}

export async function searchKnowledge(
  orgId: string,
  query: string,
  limit: number = 5,
  orgSlug?: string
): Promise<SearchResult[]> {
  const knowledgeRoot = path.join(process.cwd(), "knowledge");
  const orgKnowledgeRoot = orgSlug ? path.join(knowledgeRoot, orgSlug) : "";

  const orgFiles = orgKnowledgeRoot ? await loadMarkdownFiles(orgKnowledgeRoot) : [];
  const fallbackFiles = await loadMarkdownFiles(knowledgeRoot);
  const files = orgFiles.length > 0 ? orgFiles : fallbackFiles;

  if (files.length === 0) return [];

  const queryTokens = tokenize(query);
  const ranked: SearchResult[] = [];

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const chunks = chunkText(raw, { chunkSize: 1200, chunkOverlap: 150 });
    const documentTitle = path.basename(filePath, ".md");

    chunks.forEach((chunk, index) => {
      const similarity =
        queryTokens.length > 0
          ? scoreChunk(queryTokens, chunk, documentTitle)
          : index === 0
            ? 1
            : 0;

      if (similarity > 0) {
        ranked.push({
          chunkId: `${orgId}:${documentTitle}:${index}`,
          content: chunk,
          similarity,
          documentTitle,
        });
      }
    });
  }

  return ranked.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}
