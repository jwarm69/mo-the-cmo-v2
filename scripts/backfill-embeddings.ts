/**
 * One-time script: read all knowledge markdown files, chunk, generate
 * embeddings, and upsert into knowledge_chunks.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts
 */

import path from "path";
import { promises as fs } from "fs";
import { eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const embeddingModel = openai.embedding("text-embedding-3-small");

async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text.slice(0, 8000),
  });
  return embedding;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts.map((t) => t.slice(0, 8000)),
  });
  return embeddings;
}

function chunkText(text: string, chunkSize = 1000, chunkOverlap = 200): string[] {
  const chunks: string[] = [];
  if (!text.trim()) return chunks;
  const step = chunkSize - chunkOverlap;
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start += step;
  }
  return chunks;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  // Step 1: Backfill knowledge_chunks without embeddings
  console.log("Backfilling knowledge_chunks embeddings...");

  const chunksWithoutEmbeddings = await db
    .select({
      id: schema.knowledgeChunks.id,
      content: schema.knowledgeChunks.content,
    })
    .from(schema.knowledgeChunks)
    .where(isNull(schema.knowledgeChunks.embedding));

  console.log(`Found ${chunksWithoutEmbeddings.length} chunks without embeddings`);

  // Process in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunksWithoutEmbeddings.length; i += BATCH_SIZE) {
    const batch = chunksWithoutEmbeddings.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      await db
        .update(schema.knowledgeChunks)
        .set({ embedding: embeddings[j] })
        .where(eq(schema.knowledgeChunks.id, batch[j].id));
    }

    console.log(`  Processed ${Math.min(i + BATCH_SIZE, chunksWithoutEmbeddings.length)}/${chunksWithoutEmbeddings.length}`);
  }

  // Step 2: Ingest any markdown files not yet in the DB
  console.log("\nChecking for un-ingested markdown files...");
  const knowledgeDir = path.join(process.cwd(), "knowledge");
  let mdFiles: string[] = [];
  try {
    const entries = await fs.readdir(knowledgeDir, { withFileTypes: true });
    mdFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);
  } catch {
    console.log("No knowledge directory found, skipping file ingest");
  }

  const existingDocs = await db
    .select({ sourcePath: schema.knowledgeDocuments.sourcePath })
    .from(schema.knowledgeDocuments);
  const existingPaths = new Set(existingDocs.map((d) => d.sourcePath));

  for (const file of mdFiles) {
    const filePath = path.join(knowledgeDir, file);
    if (existingPaths.has(filePath)) continue;

    const content = await fs.readFile(filePath, "utf8");
    const chunks = chunkText(content);

    const [doc] = await db
      .insert(schema.knowledgeDocuments)
      .values({
        orgId: "00000000-0000-0000-0000-000000000000", // placeholder; update per-org as needed
        title: file.replace(".md", ""),
        content,
        sourceType: "file",
        sourcePath: filePath,
        chunkCount: chunks.length,
      })
      .returning({ id: schema.knowledgeDocuments.id });

    if (chunks.length > 0) {
      const embeddings = await generateEmbeddings(chunks);
      await db.insert(schema.knowledgeChunks).values(
        chunks.map((chunk, index) => ({
          documentId: doc.id,
          orgId: "00000000-0000-0000-0000-000000000000",
          content: chunk,
          chunkIndex: index,
          embedding: embeddings[index] || null,
        }))
      );
    }

    console.log(`  Ingested: ${file} (${chunks.length} chunks)`);
  }

  // Step 3: Backfill learning_embeddings
  console.log("\nBackfilling learning embeddings...");

  const learningsWithoutEmbeddings = await db
    .select({
      id: schema.agentLearnings.id,
      category: schema.agentLearnings.category,
      insight: schema.agentLearnings.insight,
      orgId: schema.agentLearnings.orgId,
    })
    .from(schema.agentLearnings);

  const existingLearningEmbeddings = await db
    .select({ learningId: schema.learningEmbeddings.learningId })
    .from(schema.learningEmbeddings);
  const embeddedLearningIds = new Set(existingLearningEmbeddings.map((e) => e.learningId));

  const toEmbed = learningsWithoutEmbeddings.filter((l) => !embeddedLearningIds.has(l.id));
  console.log(`Found ${toEmbed.length} learnings without embeddings`);

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    const texts = batch.map((l) => `${l.category}: ${l.insight}`);
    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      await db.insert(schema.learningEmbeddings).values({
        learningId: batch[j].id,
        orgId: batch[j].orgId,
        embedding: embeddings[j],
      });
    }

    console.log(`  Processed ${Math.min(i + BATCH_SIZE, toEmbed.length)}/${toEmbed.length}`);
  }

  console.log("\nDone!");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
