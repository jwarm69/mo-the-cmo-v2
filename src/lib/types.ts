export type Platform = "tiktok" | "instagram" | "twitter" | "email" | "blog";

export type ContentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

export interface KnowledgeDocument {
  id: string;
  title: string;
  sourceType: string;
  contentHash: string;
  chunkCount: number;
  createdAt: Date;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
}

export interface ContentItem {
  id: string;
  platform: Platform;
  pillar: string;
  topic: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  status: ContentStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  performanceScore?: number | null;
  agentLoopMetadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CalendarSlot {
  id: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  time: string;
  platform: Platform;
  contentItemId?: string;
}
