import type {
  KnowledgeDocument,
  KnowledgeChunk,
} from "./types";

export const knowledgeDocuments = new Map<string, KnowledgeDocument>();
export const knowledgeChunks = new Map<string, KnowledgeChunk>();
export const docChunkIndex = new Map<string, string[]>(); // docId -> chunkIds

export let ragInitialized = false;
export function setRagInitialized(value: boolean) {
  ragInitialized = value;
}
