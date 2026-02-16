-- Keep only the newest brand profile per organization before adding uniqueness.
WITH ranked AS (
  SELECT
    id,
    org_id,
    ROW_NUMBER() OVER (
      PARTITION BY org_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_num
  FROM brand_profiles
)
DELETE FROM brand_profiles
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS brand_profiles_org_unique_idx
  ON brand_profiles (org_id);

CREATE INDEX IF NOT EXISTS brand_profiles_org_idx
  ON brand_profiles (org_id);
