import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  real,
  boolean,
  pgEnum,
  vector,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "published",
  "scored",
  "archived",
]);

export const platformEnum = pgEnum("platform", [
  "tiktok",
  "instagram",
  "twitter",
  "facebook",
  "linkedin",
  "email",
  "blog",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);

export const approvalTierEnum = pgEnum("approval_tier", [
  "auto_approve",
  "quick_review",
  "full_review",
]);

export const learningTypeEnum = pgEnum("learning_type", [
  "performance_feedback",
  "user_correction",
  "explicit_preference",
  "ab_test_result",
  "pattern_recognition",
]);

export const learningConfidenceEnum = pgEnum("learning_confidence", [
  "low",
  "medium",
  "high",
  "validated",
]);

// ─── Organizations ───────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── User Profiles ──────────────────────────────────────────────────

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id — NOT defaultRandom
  email: text("email").notNull(),
  displayName: text("display_name"),
  orgId: uuid("org_id").references(() => organizations.id),
  usageLimitCents: integer("usage_limit_cents").default(50).notNull(), // $0.50
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Usage Tracking ─────────────────────────────────────────────────

export const usageTracking = pgTable(
  "usage_tracking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userProfiles.id)
      .notNull(),
    orgId: uuid("org_id").references(() => organizations.id),
    model: text("model").notNull(),
    route: text("route").notNull(),
    promptTokens: integer("prompt_tokens").default(0).notNull(),
    completionTokens: integer("completion_tokens").default(0).notNull(),
    totalTokens: integer("total_tokens").default(0).notNull(),
    costCents: real("cost_cents").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("usage_tracking_user_idx").on(table.userId),
    index("usage_tracking_user_created_idx").on(table.userId, table.createdAt),
  ]
);

// ─── Brand Profiles ──────────────────────────────────────────────────

export const brandProfiles = pgTable(
  "brand_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    name: text("name").notNull(),
    voice: text("voice"),
    tone: text("tone"),
    messagingPillars: jsonb("messaging_pillars").$type<string[]>(),
    contentPillars: jsonb("content_pillars").$type<
      { name: string; ratio: number; description: string }[]
    >(),
    targetAudience: jsonb("target_audience").$type<{
      demographics: string;
      psychographics: string;
      painPoints: string[];
      goals: string[];
    }>(),
    brandGuidelines: text("brand_guidelines"),
    competitors: jsonb("competitors").$type<string[]>(),
    hashtags: jsonb("hashtags").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("brand_profiles_org_unique_idx").on(table.orgId),
    index("brand_profiles_org_idx").on(table.orgId),
  ]
);

// ─── Campaigns ───────────────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective"),
  status: campaignStatusEnum("status").default("draft").notNull(),
  platforms: jsonb("platforms").$type<string[]>(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: real("budget"),
  metrics: jsonb("metrics").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Content Items ───────────────────────────────────────────────────

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    platform: platformEnum("platform").notNull(),
    status: contentStatusEnum("status").default("draft").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    mediaUrls: jsonb("media_urls").$type<string[]>(),
    hashtags: jsonb("hashtags").$type<string[]>(),
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),
    externalId: text("external_id"),
    performanceScore: real("performance_score"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("content_items_org_status_idx").on(table.orgId, table.status),
    index("content_items_platform_idx").on(table.platform),
    index("content_items_scheduled_idx").on(table.scheduledAt),
  ]
);

// ─── Calendar Slots ──────────────────────────────────────────────────

export const calendarSlots = pgTable("calendar_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  platform: platformEnum("platform").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun, 6=Sat
  timeSlot: text("time_slot").notNull(), // HH:MM format
  contentPillar: text("content_pillar"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Email Sequences ─────────────────────────────────────────────────

export const emailSequences = pgTable("email_sequences", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  name: text("name").notNull(),
  description: text("description"),
  triggerEvent: text("trigger_event"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailSequenceSteps = pgTable("email_sequence_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequenceId: uuid("sequence_id")
    .references(() => emailSequences.id)
    .notNull(),
  stepOrder: integer("step_order").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Performance Metrics ─────────────────────────────────────────────

export const performanceMetrics = pgTable(
  "performance_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    contentItemId: uuid("content_item_id").references(() => contentItems.id),
    platform: platformEnum("platform").notNull(),
    date: timestamp("date").notNull(),
    impressions: integer("impressions").default(0),
    reach: integer("reach").default(0),
    engagement: integer("engagement").default(0),
    clicks: integer("clicks").default(0),
    shares: integer("shares").default(0),
    saves: integer("saves").default(0),
    comments: integer("comments").default(0),
    likes: integer("likes").default(0),
    engagementRate: real("engagement_rate"),
    rawData: jsonb("raw_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("perf_metrics_content_idx").on(table.contentItemId),
    index("perf_metrics_date_idx").on(table.date),
  ]
);

// ─── Agent Learnings ─────────────────────────────────────────────────

export const agentLearnings = pgTable(
  "agent_learnings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    type: learningTypeEnum("type").notNull(),
    category: text("category").notNull(),
    insight: text("insight").notNull(),
    evidence: jsonb("evidence").$type<{
      contentIds?: string[];
      metrics?: Record<string, number>;
      diff?: string;
    }>(),
    confidence: learningConfidenceEnum("confidence").default("low").notNull(),
    weight: real("weight").default(1.0).notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_learnings_org_cat_idx").on(table.orgId, table.category),
    index("agent_learnings_confidence_idx").on(table.confidence),
  ]
);

// ─── Agent Preferences ──────────────────────────────────────────────

export const agentPreferences = pgTable("agent_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  category: text("category").notNull(),
  preference: text("preference").notNull(),
  source: text("source").notNull(), // "explicit", "inferred"
  strength: real("strength").default(1.0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Knowledge Documents ─────────────────────────────────────────────

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  title: text("title").notNull(),
  sourceType: text("source_type").notNull(), // "file", "url", "manual"
  sourcePath: text("source_path"),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  chunkCount: integer("chunk_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .references(() => knowledgeDocuments.id)
      .notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    chunkIndex: integer("chunk_index").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("knowledge_chunks_doc_idx").on(table.documentId)]
);

// ─── Learning Embeddings ─────────────────────────────────────────────

export const learningEmbeddings = pgTable("learning_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  learningId: uuid("learning_id")
    .references(() => agentLearnings.id)
    .notNull(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Approval Requests ───────────────────────────────────────────────

export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  contentItemId: uuid("content_item_id")
    .references(() => contentItems.id)
    .notNull(),
  tier: approvalTierEnum("tier").default("quick_review").notNull(),
  status: text("status").default("pending").notNull(), // "pending", "approved", "rejected", "revised"
  reviewerNotes: text("reviewer_notes"),
  originalBody: text("original_body"),
  editedBody: text("edited_body"),
  editDiff: jsonb("edit_diff"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports
export type Organization = typeof organizations.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type UsageTrackingRow = typeof usageTracking.$inferSelect;
export type BrandProfile = typeof brandProfiles.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type CalendarSlot = typeof calendarSlots.$inferSelect;
export type EmailSequence = typeof emailSequences.$inferSelect;
export type EmailSequenceStep = typeof emailSequenceSteps.$inferSelect;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type AgentLearning = typeof agentLearnings.$inferSelect;
export type AgentPreference = typeof agentPreferences.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
