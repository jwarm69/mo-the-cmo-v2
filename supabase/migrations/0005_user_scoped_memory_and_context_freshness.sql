-- Migration 0005: user-scoped memory partitioning + RLS tightening

ALTER TABLE public.agent_learnings
  ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_learnings_user_id_user_profiles_id_fk'
  ) THEN
    ALTER TABLE public.agent_learnings
      ADD CONSTRAINT agent_learnings_user_id_user_profiles_id_fk
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agent_learnings_org_user_cat_idx
  ON public.agent_learnings (org_id, user_id, category);

ALTER TABLE public.learning_embeddings
  ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'learning_embeddings_user_id_user_profiles_id_fk'
  ) THEN
    ALTER TABLE public.learning_embeddings
      ADD CONSTRAINT learning_embeddings_user_id_user_profiles_id_fk
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS learning_embeddings_org_user_idx
  ON public.learning_embeddings (org_id, user_id);

-- RLS: keep org isolation but enforce user partition:
-- visible memories are org-shared (user_id IS NULL) or owned by auth.uid()
DROP POLICY IF EXISTS "org isolation select" ON public.agent_learnings;
DROP POLICY IF EXISTS "org isolation insert" ON public.agent_learnings;
DROP POLICY IF EXISTS "org isolation update" ON public.agent_learnings;
DROP POLICY IF EXISTS "org isolation delete" ON public.agent_learnings;

CREATE POLICY "org+user isolation select" ON public.agent_learnings
  FOR SELECT USING (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );
CREATE POLICY "org+user isolation insert" ON public.agent_learnings
  FOR INSERT WITH CHECK (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );
CREATE POLICY "org+user isolation update" ON public.agent_learnings
  FOR UPDATE USING (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );
CREATE POLICY "org+user isolation delete" ON public.agent_learnings
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "org isolation select" ON public.learning_embeddings;
DROP POLICY IF EXISTS "org isolation insert" ON public.learning_embeddings;
DROP POLICY IF EXISTS "org isolation update" ON public.learning_embeddings;
DROP POLICY IF EXISTS "org isolation delete" ON public.learning_embeddings;

CREATE POLICY "org+user isolation select" ON public.learning_embeddings
  FOR SELECT USING (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );
CREATE POLICY "org+user isolation insert" ON public.learning_embeddings
  FOR INSERT WITH CHECK (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );
CREATE POLICY "org+user isolation update" ON public.learning_embeddings
  FOR UPDATE USING (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );
CREATE POLICY "org+user isolation delete" ON public.learning_embeddings
  FOR DELETE USING (
    org_id = public.get_user_org_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );
