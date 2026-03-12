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

// ─── Org Memberships ────────────────────────────────────────────────

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);

export const orgMemberships = pgTable(
  "org_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => userProfiles.id).notNull(),
    orgId: uuid("org_id").references(() => organizations.id).notNull(),
    role: memberRoleEnum("role").default("owner").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("org_memberships_user_org_idx").on(table.userId, table.orgId),
    index("org_memberships_user_idx").on(table.userId),
  ]
);

export type OrgMembership = typeof orgMemberships.$inferSelect;

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
    sourceContentId: uuid("source_content_id"),
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
    userId: uuid("user_id").references(() => userProfiles.id),
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
    index("agent_learnings_org_user_cat_idx").on(
      table.orgId,
      table.userId,
      table.category
    ),
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

export const learningEmbeddings = pgTable(
  "learning_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learningId: uuid("learning_id")
      .references(() => agentLearnings.id)
      .notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    userId: uuid("user_id").references(() => userProfiles.id),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("learning_embeddings_org_user_idx").on(table.orgId, table.userId)]
);

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

// ─── Ideas ──────────────────────────────────────────────────────────

export const ideaStatusEnum = pgEnum("idea_status", [
  "captured",
  "in_progress",
  "used",
  "dismissed",
]);

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    text: text("text").notNull(),
    platform: platformEnum("platform"),
    pillar: text("pillar"),
    source: text("source").default("manual").notNull(), // "manual" | "mo_suggestion"
    status: ideaStatusEnum("status").default("captured").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ideas_org_status_idx").on(table.orgId, table.status),
  ]
);

// ─── Products / Offers ─────────────────────────────────────────────
// What the business actually sells — the foundation of all marketing strategy.

export const productStatusEnum = pgEnum("product_status", [
  "idea",
  "developing",
  "pre_launch",
  "active",
  "sunsetting",
  "archived",
]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: productStatusEnum("status").default("active").notNull(),
    targetAudience: jsonb("target_audience").$type<{
      demographics: string;
      psychographics: string;
      painPoints: string[];
      goals: string[];
    }>(),
    pricing: jsonb("pricing").$type<{
      amount: number;
      currency: string;
      model: string; // "one-time" | "subscription" | "package" | "free"
      description?: string;
    }>(),
    launchDate: timestamp("launch_date"),
    uniqueValue: text("unique_value"), // What makes this offer different
    outcomes: jsonb("outcomes").$type<string[]>(), // What customers get / transformation
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("products_org_idx").on(table.orgId),
    index("products_org_status_idx").on(table.orgId, table.status),
  ]
);

// ─── Marketing Goals ───────────────────────────────────────────────
// Measurable objectives tied to products and time horizons.

export const goalTimeframeEnum = pgEnum("goal_timeframe", [
  "weekly",
  "monthly",
  "quarterly",
  "annual",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "not_started",
  "in_progress",
  "on_track",
  "at_risk",
  "completed",
  "missed",
]);

export const marketingGoals = pgTable(
  "marketing_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    productId: uuid("product_id").references(() => products.id),
    title: text("title").notNull(),
    description: text("description"),
    timeframe: goalTimeframeEnum("timeframe").notNull(),
    status: goalStatusEnum("status").default("not_started").notNull(),
    targetMetric: text("target_metric"), // e.g., "new clients", "revenue", "email signups"
    targetValue: real("target_value"), // e.g., 10, 5000, 500
    currentValue: real("current_value").default(0),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    parentGoalId: uuid("parent_goal_id"), // Allows quarterly → monthly → weekly hierarchy
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("goals_org_idx").on(table.orgId),
    index("goals_org_timeframe_idx").on(table.orgId, table.timeframe),
    index("goals_org_status_idx").on(table.orgId, table.status),
    index("goals_product_idx").on(table.productId),
    index("goals_parent_idx").on(table.parentGoalId),
  ]
);

// ─── Marketing Plans ───────────────────────────────────────────────
// Hierarchical plans: quarter → month → week, each with themes and strategy.

export const planTypeEnum = pgEnum("plan_type", [
  "quarterly",
  "monthly",
  "weekly",
  "launch",     // Special: product launch plan
  "campaign",   // Special: campaign-specific plan
]);

export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "active",
  "completed",
  "archived",
]);

export const marketingPlans = pgTable(
  "marketing_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    parentPlanId: uuid("parent_plan_id"), // Allows quarter → month → week nesting
    goalId: uuid("goal_id").references(() => marketingGoals.id),
    productId: uuid("product_id").references(() => products.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    type: planTypeEnum("type").notNull(),
    status: planStatusEnum("status").default("draft").notNull(),
    title: text("title").notNull(),
    theme: text("theme"), // e.g., "Authority Building", "Launch Hype", "Community Nurturing"
    summary: text("summary"), // AI-generated strategic overview
    strategy: text("strategy"), // Detailed strategic direction
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    channelMix: jsonb("channel_mix").$type<{
      channel: string;
      weight: number; // percentage allocation
      rationale: string;
    }[]>(),
    keyMessages: jsonb("key_messages").$type<string[]>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("plans_org_idx").on(table.orgId),
    index("plans_org_type_idx").on(table.orgId, table.type),
    index("plans_parent_idx").on(table.parentPlanId),
    index("plans_goal_idx").on(table.goalId),
    index("plans_product_idx").on(table.productId),
  ]
);

// ─── Tactics ────────────────────────────────────────────────────────
// Specific marketing actions across ALL channels (not just social content).
// This is where guerrilla, activation, physical, partnership tactics live.

export const tacticStatusEnum = pgEnum("tactic_status", [
  "planned",
  "in_progress",
  "completed",
  "skipped",
]);

export const tactics = pgTable(
  "tactics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    planId: uuid("plan_id").references(() => marketingPlans.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    contentItemId: uuid("content_item_id").references(() => contentItems.id),
    channel: text("channel").notNull(), // Freeform: "tiktok", "guerrilla", "local-event", "podcast-guesting", etc.
    channelCategory: text("channel_category").notNull(), // "digital", "physical", "guerrilla", "partnership", "activation", "creative", "paid"
    title: text("title").notNull(),
    description: text("description"),
    status: tacticStatusEnum("status").default("planned").notNull(),
    scheduledDate: timestamp("scheduled_date"),
    completedDate: timestamp("completed_date"),
    effort: text("effort"), // "low" | "medium" | "high"
    cost: real("cost"),
    expectedOutcome: text("expected_outcome"),
    actualOutcome: text("actual_outcome"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tactics_org_idx").on(table.orgId),
    index("tactics_plan_idx").on(table.planId),
    index("tactics_org_channel_idx").on(table.orgId, table.channel),
    index("tactics_org_status_idx").on(table.orgId, table.status),
    index("tactics_scheduled_idx").on(table.scheduledDate),
  ]
);

// ─── Context Entries (Unified Company Brain) ────────────────────────
// Every meaningful piece of information about the business, auto-captured
// from conversations, plans, decisions, feedback — all vector-searchable.
// This is the single source of truth that powers every AI interaction.

export const contextTypeEnum = pgEnum("context_type", [
  "business_info",       // About the business itself (market, niche, location, story)
  "product_info",        // Product details, features, outcomes, pricing
  "audience_insight",    // Customer learnings, objections, motivations
  "strategy_decision",   // Strategic choices (positioning, messaging, channel selection)
  "market_insight",      // Competitive intel, trends, opportunities
  "performance_insight", // What worked, what didn't, why
  "brand_voice",         // Voice/tone preferences, examples, corrections
  "goal_context",        // Goal rationale, progress notes, pivots
  "plan_context",        // Plan summaries, strategy docs, phase descriptions
  "conversation_extract",// Key info extracted from chat conversations
]);

export const contextEntries = pgTable(
  "context_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    userId: uuid("user_id").references(() => userProfiles.id),
    type: contextTypeEnum("type").notNull(),
    title: text("title").notNull(), // Short label for display
    content: text("content").notNull(), // The actual knowledge
    source: text("source").notNull(), // Where this came from: "chat", "plan_generation", "manual", "product_create", etc.
    sourceId: text("source_id"), // ID of the source record (chatMessageId, planId, productId, etc.)
    embedding: vector("embedding", { dimensions: 1536 }),
    confidence: real("confidence").default(1.0).notNull(), // How confident we are in this info
    isActive: boolean("is_active").default(true).notNull(),
    expiresAt: timestamp("expires_at"), // Optional TTL for time-sensitive context
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("context_entries_org_idx").on(table.orgId),
    index("context_entries_org_type_idx").on(table.orgId, table.type),
    index("context_entries_org_source_idx").on(table.orgId, table.source),
    index("context_entries_active_idx").on(table.orgId, table.isActive),
  ]
);

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
export type Idea = typeof ideas.$inferSelect;
export type Product = typeof products.$inferSelect;
export type MarketingGoal = typeof marketingGoals.$inferSelect;
export type MarketingPlan = typeof marketingPlans.$inferSelect;
export type Tactic = typeof tactics.$inferSelect;
export type ContextEntry = typeof contextEntries.$inferSelect;
