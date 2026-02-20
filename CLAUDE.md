# CLAUDE.md — Mo the CMO v2

## Project Overview

Mo the CMO is an AI marketing copilot built with Next.js 16.1.6, React 19, and TypeScript (strict). It generates platform-specific marketing content, manages campaigns, and learns from user feedback over time.

**Stack**: Next.js App Router, Drizzle ORM, Supabase PostgreSQL + pgvector, AI SDK v6, shadcn/ui, Tailwind CSS v4, Zod v4

## Quick Start

```bash
cp .env.example .env.local   # Fill in real values
npm install
npm run dev                   # http://localhost:3000
```

Required env vars: `DATABASE_URL`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_API_KEY`

## Architecture

### App Router Layout

```
src/app/
  (auth)/          # Login/signup pages
  (dashboard)/     # Main app pages: chat, content, campaigns, analytics, brand, settings, setup
  api/
    chat/          # Streaming chat with Mo (orchestrator + context assembly)
    content/       # CRUD, generate, repurpose, bulk operations
    campaigns/     # Campaign CRUD with [id] dynamic route
    brand/         # Brand profile + knowledge base (upload, ingest, distill)
    usage/         # Usage tracking and limits
    dashboard/     # Dashboard stats
    suggestions/   # AI-generated content suggestions
    ideas/         # Idea capture and management
    analytics/     # Performance analytics
```

### AI Pipeline

1. **Model Router** (`src/lib/ai/model-router.ts`): Maps task types to models via keyword inference
   - GPT-4o: strategy, campaigns, reports, analysis, content writing, chat, email, ad copy
   - GPT-4o-mini: bulk variations, hashtags, reformatting
2. **Orchestrator** (`src/lib/ai/orchestrator.ts`): Assembles context → selects model → returns prompt + model
3. **Context Assembly** (`src/lib/rag/context.ts`): Builds 5-part context for every prompt:
   - Brand profile (voice, tone, pillars, audience, guidelines)
   - RAG results (knowledge base similarity search)
   - Learnings (vector-searchable past insights)
   - Preferences (explicit user preferences)
   - Current state (recent content, active campaigns, pillar balance)
4. **System Prompt** (`src/lib/ai/prompts/system.ts`): Mo's identity, capabilities, and platform-specific templates

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: `src/lib/db/schema.ts` — 15 tables including organizations, brand profiles, content items, campaigns, knowledge documents/chunks, agent learnings, approval requests, ideas
- **Migrations**: `supabase/migrations/` — managed by Drizzle Kit
- **Vector**: pgvector with 1536-dimension embeddings (OpenAI text-embedding-3-small)
- **Config**: `drizzle.config.ts`

### Auth

Dual auth system (`src/lib/api/session.ts`):
1. **Supabase SSR cookies** — for browser users with usage limits
2. **API key** (`APP_API_KEY` header/bearer) — for programmatic access, no usage limits, bound to `APP_API_KEY_ORG_SLUG`

### Multi-Tenant Org Resolution

`src/lib/api/org.ts` resolves org with priority chain:
1. Authenticated user's `orgId`
2. `orgSlug` in request body
3. `x-org-slug` header
4. `orgSlug` query param
5. `DEFAULT_ORG_SLUG` env var
6. Fallback: `"default-org"` (auto-created)

### Learning System

- **Implicit corrections**: Regex-based detection in chat route (words like "actually", "wrong", "instead")
- **Explicit memory**: Commands like "remember:", "note:", "learn:" stored as high-confidence learnings
- **Vector search**: Learnings embedded and searched via pgvector cosine similarity
- **Fallback**: Recency-based with confidence weighting when vector search fails

### RAG Pipeline

`src/lib/rag/`:
- **Ingest** (`ingest.ts`): Document → chunk (1000 chars, 200 overlap) → embed → store
- **Search** (`search.ts`): Query → embed → pgvector cosine similarity → top-k results
- **Cache** (`cache.ts`): Caching layer for search results
- **Context** (`context.ts`): Orchestrates all context sources into prompt sections

### Usage Tracking

`src/lib/usage/`:
- **Pricing** (`pricing.ts`): Per-model cost calculation (cents per 1M tokens)
- **Tracker** (`tracker.ts`): Per-route token recording, usage limit enforcement
- Configurable per-user limits via `user_profiles.usage_limit_cents`

## Key Directories

```
src/lib/ai/           # Model routing, orchestration, providers, prompts
src/lib/rag/          # RAG pipeline (ingest, search, context assembly, cache)
src/lib/memory/       # Short-term (session) and long-term (learnings + embeddings)
src/lib/db/           # Drizzle schema, client, content helpers
src/lib/usage/        # Token tracking and cost enforcement
src/lib/api/          # Auth session and org resolution
src/lib/brand/        # Brand profile defaults
src/lib/knowledge/    # Document parsers (PDF, DOCX)
src/lib/supabase/     # Supabase client/server/middleware helpers
src/components/       # React components (chat, content, campaigns, dashboard, setup, brand, ui)
```

## Commands

```bash
npm run dev            # Start dev server
npm run build          # Production build
npm run lint           # ESLint
npx drizzle-kit push   # Push schema changes directly to DB
npx drizzle-kit generate  # Generate migration SQL files
```

## Conventions

- **UI**: shadcn/ui components in `src/components/ui/`, Radix primitives, Lucide icons
- **Forms**: react-hook-form + Zod validation
- **Toasts**: Sonner
- **Charts**: Recharts
- **Platform templates**: Defined in `src/lib/ai/prompts/system.ts` (PLATFORM_TEMPLATES)
- **Content generation**: JSON output format with hook/body/cta/hashtags/pillar structure
- **Streaming**: AI SDK `streamText` with `toUIMessageStreamResponse()`
- **Types**: Drizzle `$inferSelect` type exports at bottom of schema file
