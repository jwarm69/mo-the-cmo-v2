DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  role member_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS org_memberships_user_org_idx ON org_memberships (user_id, org_id);
CREATE INDEX IF NOT EXISTS org_memberships_user_idx ON org_memberships (user_id);

-- Backfill existing user->org relationships
INSERT INTO org_memberships (user_id, org_id, role)
SELECT id, org_id, 'owner' FROM user_profiles WHERE org_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;
