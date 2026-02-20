-- Migration 0004: Enable Row Level Security on all tables
-- Defense-in-depth: the Drizzle `db` client uses DATABASE_URL (service role)
-- and bypasses RLS automatically. These policies protect against direct
-- PostgREST / anon-key access only.

-- ─── Helper: resolve auth.uid() → org_id ────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT org_id FROM public.user_profiles WHERE id = auth.uid()
$$;

-- ─── organizations ──────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own org"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id());

-- ─── user_profiles ──────────────────────────────────────────────────

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own profile and org members"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid() OR org_id = public.get_user_org_id());

CREATE POLICY "users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── usage_tracking ─────────────────────────────────────────────────

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (user_id = auth.uid());

-- ─── Standard org_id pattern ────────────────────────────────────────
-- Applied to: brand_profiles, campaigns, content_items, calendar_slots,
-- email_sequences, performance_metrics, agent_learnings, agent_preferences,
-- knowledge_documents, knowledge_chunks, learning_embeddings, approval_requests

-- brand_profiles
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.brand_profiles
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.brand_profiles
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.brand_profiles
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.brand_profiles
  FOR DELETE USING (org_id = public.get_user_org_id());

-- campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.campaigns
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.campaigns
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.campaigns
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.campaigns
  FOR DELETE USING (org_id = public.get_user_org_id());

-- content_items
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.content_items
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.content_items
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.content_items
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.content_items
  FOR DELETE USING (org_id = public.get_user_org_id());

-- calendar_slots
ALTER TABLE public.calendar_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.calendar_slots
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.calendar_slots
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.calendar_slots
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.calendar_slots
  FOR DELETE USING (org_id = public.get_user_org_id());

-- email_sequences
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.email_sequences
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.email_sequences
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.email_sequences
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.email_sequences
  FOR DELETE USING (org_id = public.get_user_org_id());

-- email_sequence_steps (join through email_sequences for org check)
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.email_sequence_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.email_sequences es
      WHERE es.id = sequence_id AND es.org_id = public.get_user_org_id()
    )
  );
CREATE POLICY "org isolation insert" ON public.email_sequence_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_sequences es
      WHERE es.id = sequence_id AND es.org_id = public.get_user_org_id()
    )
  );
CREATE POLICY "org isolation update" ON public.email_sequence_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.email_sequences es
      WHERE es.id = sequence_id AND es.org_id = public.get_user_org_id()
    )
  );
CREATE POLICY "org isolation delete" ON public.email_sequence_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.email_sequences es
      WHERE es.id = sequence_id AND es.org_id = public.get_user_org_id()
    )
  );

-- performance_metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.performance_metrics
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.performance_metrics
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.performance_metrics
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.performance_metrics
  FOR DELETE USING (org_id = public.get_user_org_id());

-- agent_learnings
ALTER TABLE public.agent_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.agent_learnings
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.agent_learnings
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.agent_learnings
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.agent_learnings
  FOR DELETE USING (org_id = public.get_user_org_id());

-- agent_preferences
ALTER TABLE public.agent_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.agent_preferences
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.agent_preferences
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.agent_preferences
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.agent_preferences
  FOR DELETE USING (org_id = public.get_user_org_id());

-- knowledge_documents
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.knowledge_documents
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.knowledge_documents
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.knowledge_documents
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.knowledge_documents
  FOR DELETE USING (org_id = public.get_user_org_id());

-- knowledge_chunks
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.knowledge_chunks
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.knowledge_chunks
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.knowledge_chunks
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.knowledge_chunks
  FOR DELETE USING (org_id = public.get_user_org_id());

-- learning_embeddings
ALTER TABLE public.learning_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.learning_embeddings
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.learning_embeddings
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.learning_embeddings
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.learning_embeddings
  FOR DELETE USING (org_id = public.get_user_org_id());

-- approval_requests
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org isolation select" ON public.approval_requests
  FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "org isolation insert" ON public.approval_requests
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation update" ON public.approval_requests
  FOR UPDATE USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
CREATE POLICY "org isolation delete" ON public.approval_requests
  FOR DELETE USING (org_id = public.get_user_org_id());
