CREATE TYPE "public"."context_type" AS ENUM('business_info', 'product_info', 'audience_insight', 'strategy_decision', 'market_insight', 'performance_insight', 'brand_voice', 'goal_context', 'plan_context', 'conversation_extract');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('not_started', 'in_progress', 'on_track', 'at_risk', 'completed', 'missed');--> statement-breakpoint
CREATE TYPE "public"."goal_timeframe" AS ENUM('weekly', 'monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."idea_status" AS ENUM('captured', 'in_progress', 'used', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('quarterly', 'monthly', 'weekly', 'launch', 'campaign');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('idea', 'developing', 'pre_launch', 'active', 'sunsetting', 'archived');--> statement-breakpoint
CREATE TYPE "public"."tactic_status" AS ENUM('planned', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TABLE "context_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"type" "context_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"embedding" vector(1536),
	"confidence" real DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"text" text NOT NULL,
	"platform" "platform",
	"pillar" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"status" "idea_status" DEFAULT 'captured' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"timeframe" "goal_timeframe" NOT NULL,
	"status" "goal_status" DEFAULT 'not_started' NOT NULL,
	"target_metric" text,
	"target_value" real,
	"current_value" real DEFAULT 0,
	"start_date" timestamp,
	"end_date" timestamp,
	"parent_goal_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"parent_plan_id" uuid,
	"goal_id" uuid,
	"product_id" uuid,
	"campaign_id" uuid,
	"type" "plan_type" NOT NULL,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"theme" text,
	"summary" text,
	"strategy" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"channel_mix" jsonb,
	"key_messages" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"target_audience" jsonb,
	"pricing" jsonb,
	"launch_date" timestamp,
	"unique_value" text,
	"outcomes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tactics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"plan_id" uuid,
	"campaign_id" uuid,
	"content_item_id" uuid,
	"channel" text NOT NULL,
	"channel_category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "tactic_status" DEFAULT 'planned' NOT NULL,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"effort" text,
	"cost" real,
	"expected_outcome" text,
	"actual_outcome" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_learnings" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "source_content_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_embeddings" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "context_entries" ADD CONSTRAINT "context_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_entries" ADD CONSTRAINT "context_entries_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_goals" ADD CONSTRAINT "marketing_goals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_goals" ADD CONSTRAINT "marketing_goals_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_goal_id_marketing_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."marketing_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tactics" ADD CONSTRAINT "tactics_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tactics" ADD CONSTRAINT "tactics_plan_id_marketing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."marketing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tactics" ADD CONSTRAINT "tactics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tactics" ADD CONSTRAINT "tactics_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "context_entries_org_idx" ON "context_entries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "context_entries_org_type_idx" ON "context_entries" USING btree ("org_id","type");--> statement-breakpoint
CREATE INDEX "context_entries_org_source_idx" ON "context_entries" USING btree ("org_id","source");--> statement-breakpoint
CREATE INDEX "context_entries_active_idx" ON "context_entries" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "ideas_org_status_idx" ON "ideas" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "goals_org_idx" ON "marketing_goals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "goals_org_timeframe_idx" ON "marketing_goals" USING btree ("org_id","timeframe");--> statement-breakpoint
CREATE INDEX "goals_org_status_idx" ON "marketing_goals" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "goals_product_idx" ON "marketing_goals" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "goals_parent_idx" ON "marketing_goals" USING btree ("parent_goal_id");--> statement-breakpoint
CREATE INDEX "plans_org_idx" ON "marketing_plans" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "plans_org_type_idx" ON "marketing_plans" USING btree ("org_id","type");--> statement-breakpoint
CREATE INDEX "plans_parent_idx" ON "marketing_plans" USING btree ("parent_plan_id");--> statement-breakpoint
CREATE INDEX "plans_goal_idx" ON "marketing_plans" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "plans_product_idx" ON "marketing_plans" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_memberships_user_org_idx" ON "org_memberships" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "org_memberships_user_idx" ON "org_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_org_idx" ON "products" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "products_org_status_idx" ON "products" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "tactics_org_idx" ON "tactics" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tactics_plan_idx" ON "tactics" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "tactics_org_channel_idx" ON "tactics" USING btree ("org_id","channel");--> statement-breakpoint
CREATE INDEX "tactics_org_status_idx" ON "tactics" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "tactics_scheduled_idx" ON "tactics" USING btree ("scheduled_date");--> statement-breakpoint
ALTER TABLE "agent_learnings" ADD CONSTRAINT "agent_learnings_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_embeddings" ADD CONSTRAINT "learning_embeddings_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_learnings_org_user_cat_idx" ON "agent_learnings" USING btree ("org_id","user_id","category");--> statement-breakpoint
CREATE INDEX "learning_embeddings_org_user_idx" ON "learning_embeddings" USING btree ("org_id","user_id");