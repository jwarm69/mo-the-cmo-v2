/**
 * Content items DB access layer.
 * Translates between DB shape and UI ContentItem shape.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { contentItems as contentItemsTable } from "./schema";
import type { ContentItem as UIContentItem, ContentStatus, Platform } from "@/lib/types";

type ContentRow = typeof contentItemsTable.$inferSelect;

interface ContentMetadata {
  pillar?: string;
  topic?: string;
  cta?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  [key: string]: unknown;
}

function getMetadata(row: ContentRow): ContentMetadata {
  return (row.metadata ?? {}) as ContentMetadata;
}

export function dbRowToContentItem(row: ContentRow): UIContentItem {
  const meta = getMetadata(row);

  let scheduledDate: string | undefined;
  let scheduledTime: string | undefined;
  if (row.scheduledAt) {
    const d = new Date(row.scheduledAt);
    scheduledDate = d.toISOString().split("T")[0];
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    scheduledTime = `${hh}:${mm}`;
  } else {
    scheduledDate = meta.scheduledDate;
    scheduledTime = meta.scheduledTime;
  }

  return {
    id: row.id,
    platform: row.platform as Platform,
    pillar: (meta.pillar as string) || "General",
    topic: (meta.topic as string) || "",
    hook: row.title || "",
    body: row.body,
    cta: (meta.cta as string) || "",
    hashtags: (row.hashtags as string[]) || [],
    status: row.status as ContentStatus,
    scheduledDate,
    scheduledTime,
    performanceScore: row.performanceScore,
    agentLoopMetadata: (meta.agentLoop as Record<string, unknown>) ?? null,
    createdAt: row.createdAt,
  };
}

function buildScheduledAt(
  scheduledDate?: string,
  scheduledTime?: string
): Date | null {
  if (!scheduledDate) return null;
  const time = scheduledTime || "12:00";
  return new Date(`${scheduledDate}T${time}:00Z`);
}

export interface ContentFilters {
  platform?: Platform;
  status?: ContentStatus;
}

export async function listContent(
  orgId: string,
  filters?: ContentFilters
): Promise<UIContentItem[]> {
  const conditions = [eq(contentItemsTable.orgId, orgId)];
  if (filters?.platform) {
    conditions.push(eq(contentItemsTable.platform, filters.platform));
  }
  if (filters?.status) {
    conditions.push(eq(contentItemsTable.status, filters.status));
  }

  const rows = await db
    .select()
    .from(contentItemsTable)
    .where(and(...conditions))
    .orderBy(desc(contentItemsTable.createdAt));

  return rows.map(dbRowToContentItem);
}

export async function getContentById(
  id: string,
  orgId: string
): Promise<UIContentItem | null> {
  const [row] = await db
    .select()
    .from(contentItemsTable)
    .where(and(eq(contentItemsTable.id, id), eq(contentItemsTable.orgId, orgId)))
    .limit(1);

  return row ? dbRowToContentItem(row) : null;
}

export interface InsertContentInput {
  platform: Platform;
  hook?: string;
  body: string;
  cta?: string;
  hashtags?: string[];
  pillar?: string;
  topic?: string;
  status?: ContentStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  campaignId?: string;
  performanceScore?: number;
  agentLoopMetadata?: Record<string, unknown>;
}

export async function insertContent(
  orgId: string,
  data: InsertContentInput
): Promise<UIContentItem> {
  const scheduledAt = buildScheduledAt(data.scheduledDate, data.scheduledTime);

  const metadata: ContentMetadata = {};
  if (data.pillar) metadata.pillar = data.pillar;
  if (data.topic) metadata.topic = data.topic;
  if (data.cta) metadata.cta = data.cta;
  if (data.scheduledDate) metadata.scheduledDate = data.scheduledDate;
  if (data.scheduledTime) metadata.scheduledTime = data.scheduledTime;
  if (data.agentLoopMetadata) {
    Object.assign(metadata, { agentLoop: data.agentLoopMetadata });
  }

  const [row] = await db
    .insert(contentItemsTable)
    .values({
      orgId,
      platform: data.platform,
      title: data.hook || null,
      body: data.body,
      hashtags: data.hashtags || [],
      status: data.status || "draft",
      scheduledAt,
      metadata,
      campaignId: data.campaignId || null,
      performanceScore: data.performanceScore ?? null,
    })
    .returning();

  return dbRowToContentItem(row);
}

export interface UpdateContentInput {
  hook?: string;
  body?: string;
  cta?: string;
  hashtags?: string[];
  pillar?: string;
  topic?: string;
  status?: ContentStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  platform?: Platform;
}

export async function updateContent(
  id: string,
  orgId: string,
  updates: UpdateContentInput
): Promise<UIContentItem | null> {
  const [existing] = await db
    .select()
    .from(contentItemsTable)
    .where(and(eq(contentItemsTable.id, id), eq(contentItemsTable.orgId, orgId)))
    .limit(1);

  if (!existing) return null;

  const existingMeta = getMetadata(existing);
  const newMeta: ContentMetadata = { ...existingMeta };
  if (updates.pillar !== undefined) newMeta.pillar = updates.pillar;
  if (updates.topic !== undefined) newMeta.topic = updates.topic;
  if (updates.cta !== undefined) newMeta.cta = updates.cta;
  if (updates.scheduledDate !== undefined) newMeta.scheduledDate = updates.scheduledDate;
  if (updates.scheduledTime !== undefined) newMeta.scheduledTime = updates.scheduledTime;

  const setValues: Record<string, unknown> = {
    metadata: newMeta,
    updatedAt: new Date(),
  };

  if (updates.hook !== undefined) setValues.title = updates.hook;
  if (updates.body !== undefined) setValues.body = updates.body;
  if (updates.hashtags !== undefined) setValues.hashtags = updates.hashtags;
  if (updates.status !== undefined) setValues.status = updates.status;
  if (updates.platform !== undefined) setValues.platform = updates.platform;

  const sd = updates.scheduledDate ?? existingMeta.scheduledDate;
  const st = updates.scheduledTime ?? existingMeta.scheduledTime;
  const scheduledAt = buildScheduledAt(sd, st);
  if (scheduledAt) setValues.scheduledAt = scheduledAt;

  const [updated] = await db
    .update(contentItemsTable)
    .set(setValues)
    .where(and(eq(contentItemsTable.id, id), eq(contentItemsTable.orgId, orgId)))
    .returning();

  return updated ? dbRowToContentItem(updated) : null;
}

export async function deleteContent(
  id: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .delete(contentItemsTable)
    .where(and(eq(contentItemsTable.id, id), eq(contentItemsTable.orgId, orgId)))
    .returning({ id: contentItemsTable.id });

  return result.length > 0;
}

/**
 * Returns the original DB row for diff comparison before updates.
 */
export async function getContentRowForDiff(
  id: string,
  orgId: string
): Promise<UIContentItem | null> {
  return getContentById(id, orgId);
}

/**
 * Check if hook/body/cta changed between original and updated content.
 */
export function hasContentEdits(
  original: UIContentItem,
  updates: UpdateContentInput
): boolean {
  if (updates.hook !== undefined && updates.hook !== original.hook) return true;
  if (updates.body !== undefined && updates.body !== original.body) return true;
  if (updates.cta !== undefined && updates.cta !== original.cta) return true;
  return false;
}

/**
 * Human-readable description of what changed.
 */
export function describeDiff(
  original: UIContentItem,
  updates: UpdateContentInput
): string {
  const changes: string[] = [];

  if (updates.hook !== undefined && updates.hook !== original.hook) {
    changes.push(`Hook changed from "${truncate(original.hook)}" to "${truncate(updates.hook)}"`);
  }
  if (updates.body !== undefined && updates.body !== original.body) {
    changes.push(`Body was edited (${original.body.length} -> ${updates.body.length} chars)`);
  }
  if (updates.cta !== undefined && updates.cta !== original.cta) {
    changes.push(`CTA changed from "${truncate(original.cta)}" to "${truncate(updates.cta)}"`);
  }

  return changes.join("; ");
}

function truncate(s: string, max = 50): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}
