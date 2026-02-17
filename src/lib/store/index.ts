import type {
  KnowledgeDocument,
  KnowledgeChunk,
  ContentItem,
  CalendarSlot,
} from "./types";

export const knowledgeDocuments = new Map<string, KnowledgeDocument>();
export const knowledgeChunks = new Map<string, KnowledgeChunk>();
export const docChunkIndex = new Map<string, string[]>(); // docId -> chunkIds
export const contentItems = new Map<string, ContentItem>();
export const calendarSlots = new Map<string, CalendarSlot>();

export let ragInitialized = false;
export function setRagInitialized(value: boolean) {
  ragInitialized = value;
}
