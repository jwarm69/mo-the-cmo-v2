# Mo the CMO

Mo is a multi-tenant AI CMO app (Next.js + Drizzle + Postgres) with:
- protected API endpoints (`x-api-key`/Bearer token)
- per-org brand profiles
- task-routed model selection
- knowledge-backed context assembly from markdown docs

## 1. Prerequisites

- Node 20+
- Postgres (Supabase or local)
- API keys: Anthropic and/or OpenAI

## 2. Environment

Copy `.env.example` to `.env.local` and set values:

- `DATABASE_URL`
- `APP_API_KEY` (server-only — never use `NEXT_PUBLIC_` prefix)
- `DEFAULT_ORG_SLUG` / `NEXT_PUBLIC_DEFAULT_ORG_SLUG`
- `DEFAULT_ORG_NAME` / `NEXT_PUBLIC_DEFAULT_ORG_NAME`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

## 3. Database Migration

Apply SQL migration:

- `supabase/migrations/0001_brand_profiles_org_unique.sql`

This enforces one brand profile per org and de-duplicates existing rows.

## 4. Run

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## 5. Organization Knowledge

Mo reads knowledge files from:

1. `knowledge/<org-slug>/*.md` (preferred, org-specific)
2. fallback `knowledge/*.md`

For multi-company usage, create one folder per company slug and add their docs.

## 6. Security Notes

- API routes require `APP_API_KEY` (server-only). Never expose it to the browser via `NEXT_PUBLIC_*` env vars.
- Browser-based auth uses Supabase httpOnly cookies (auto-sent by the browser).
- Do not expose the app publicly without proper tenant membership checks.

