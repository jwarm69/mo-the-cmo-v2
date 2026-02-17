import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const CACHE_DIR = join(process.cwd(), "knowledge", ".cache");
const CACHE_FILE = join(CACHE_DIR, "embeddings.json");

interface CacheEntry {
  hash: string;
  chunks: { content: string; embedding: number[] }[];
}

interface CacheData {
  [filename: string]: CacheEntry;
}

export function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export async function loadCache(): Promise<CacheData> {
  try {
    const data = await readFile(CACHE_FILE, "utf-8");
    return JSON.parse(data) as CacheData;
  } catch {
    return {};
  }
}

export async function saveCache(data: CacheData): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(data), "utf-8");
}
