CREATE TYPE "public"."approval_tier" AS ENUM('auto_approve', 'quick_review', 'full_review');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'pending_approval', 'approved', 'scheduled', 'published', 'scored', 'archived');--> statement-breakpoint
CREATE TYPE "public"."learning_confidence" AS ENUM('low', 'medium', 'high', 'validated');--> statement-breakpoint
CREATE TYPE "public"."learning_type" AS ENUM('performance_feedback', 'user_correction', 'explicit_preference', 'ab_test_result', 'pattern_recognition');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('tiktok', 'instagram', 'twitter', 'facebook', 'linkedin', 'email', 'blog');--> statement-breakpoint
CREATE TABLE "agent_learnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" "learning_type" NOT NULL,
	"category" text NOT NULL,
	"insight" text NOT NULL,
	"evidence" jsonb,
	"confidence" "learning_confidence" DEFAULT 'low' NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category" text NOT NULL,
	"preference" text NOT NULL,
	"source" text NOT NULL,
	"strength" real DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"tier" "approval_tier" DEFAULT 'quick_review' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewer_notes" text,
	"original_body" text,
	"edited_body" text,
	"edit_diff" jsonb,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"voice" text,
	"tone" text,
	"messaging_pillars" jsonb,
	"content_pillars" jsonb,
	"target_audience" jsonb,
	"brand_guidelines" text,
	"competitors" jsonb,
	"hashtags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"day_of_week" integer NOT NULL,
	"time_slot" text NOT NULL,
	"content_pillar" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"objective" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"platforms" jsonb,
	"start_date" timestamp,
	"end_date" timestamp,
	"budget" real,
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"campaign_id" uuid,
	"platform" "platform" NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"media_urls" jsonb,
	"hashtags" jsonb,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"external_id" text,
	"performance_score" real,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequence_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"campaign_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"trigger_event" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"chunk_index" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"source_type" text NOT NULL,
	"source_path" text,
	"content" text NOT NULL,
	"metadata" jsonb,
	"chunk_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"content_item_id" uuid,
	"platform" "platform" NOT NULL,
	"date" timestamp NOT NULL,
	"impressions" integer DEFAULT 0,
	"reach" integer DEFAULT 0,
	"engagement" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"saves" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"engagement_rate" real,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid,
	"model" text NOT NULL,
	"route" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"org_id" uuid,
	"usage_limit_cents" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_learnings" ADD CONSTRAINT "agent_learnings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_preferences" ADD CONSTRAINT "agent_preferences_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_slots" ADD CONSTRAINT "calendar_slots_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequence_steps" ADD CONSTRAINT "email_sequence_steps_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_embeddings" ADD CONSTRAINT "learning_embeddings_learning_id_agent_learnings_id_fk" FOREIGN KEY ("learning_id") REFERENCES "public"."agent_learnings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_embeddings" ADD CONSTRAINT "learning_embeddings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_learnings_org_cat_idx" ON "agent_learnings" USING btree ("org_id","category");--> statement-breakpoint
CREATE INDEX "agent_learnings_confidence_idx" ON "agent_learnings" USING btree ("confidence");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_profiles_org_unique_idx" ON "brand_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "brand_profiles_org_idx" ON "brand_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "content_items_org_status_idx" ON "content_items" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "content_items_platform_idx" ON "content_items" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "content_items_scheduled_idx" ON "content_items" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_doc_idx" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "perf_metrics_content_idx" ON "performance_metrics" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "perf_metrics_date_idx" ON "performance_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "usage_tracking_user_idx" ON "usage_tracking" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_tracking_user_created_idx" ON "usage_tracking" USING btree ("user_id","created_at");