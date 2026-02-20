# DEVELOPMENT.md — Feature Tracker & Development Guide

## Feature Status

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Brand Profile Setup Wizard | Implemented | 5-step wizard (basics, voice, content pillars, customers, knowledge) |
| 2 | AI Chat with Mo | Implemented | Streaming chat with context assembly, model routing, learning loop |
| 3 | Content Generation & Management | Implemented | Generate, edit, repurpose, bulk operations, content cards |
| 4 | Content Calendar | Implemented | Monthly view with calendar slots; view-only (no drag-to-reschedule) |
| 5 | Campaign Management | Implemented | CRUD with AI-generated campaigns, platform targeting, status tracking |
| 6 | Knowledge Base / RAG | Implemented | Upload, chunk, embed, search; PDF/DOCX/text parsing |
| 7 | Agent Learning System | Implemented | Implicit corrections + explicit memory; vector-searchable learnings |
| 8 | Usage Tracking & Limits | Implemented | Per-user cost tracking, configurable limits, 429 enforcement |
| 9 | Dashboard & Analytics | Implemented | Stats, suggestion cards, idea capture, analytics page |
| 10 | Content Repurposing | Implemented | Cross-platform repurposing with source content tracking |

## Pending Migrations

The Drizzle migration journal (`supabase/migrations/meta/_journal.json`) contains only the initial migration (`0000_silent_sprite`). The following schema additions exist in `src/lib/db/schema.ts` but may not be in the database yet:

- **`ideas` table** — Idea capture with status tracking (captured/in_progress/used/dismissed)
- **`sourceContentId` column** on `content_items` — Tracks which content was repurposed from what
- **`idea_status` enum** — Status values for the ideas table

To apply pending schema changes:

```bash
# Option 1: Push directly (dev/staging)
npx drizzle-kit push

# Option 2: Generate migration SQL then apply
npx drizzle-kit generate
# Review generated SQL in supabase/migrations/
npx drizzle-kit push
```

There are also 3 manually-created migration files that may need verification:
- `0001_brand_profiles_org_unique.sql`
- `0002_user_profiles_trigger.sql`
- `0003_vector_indexes.sql`

These are not tracked in the Drizzle journal — they were likely applied manually via `psql` or Supabase dashboard.

## Known Issues & TODOs

### No External Platform Integrations
Buffer, Resend, and Inngest are stubbed in `.env.example` but not implemented. Content publishing is manual.

### Calendar is View-Only
The content calendar displays scheduled content but does not support drag-to-reschedule or interactive editing.

### No Real Publishing Pipeline
Content status transitions (draft → scheduled → published) are manual. There is no automated publishing to any platform.

### No A/B Testing or Scoring Integration
The `performanceScore` field exists on content items and `ab_test_result` exists as a learning type, but there is no actual A/B testing or performance scoring implementation.

### Auth Has No User Management UI
Authentication works via Supabase SSR cookies and API key fallback, but there is no admin UI for managing users, roles, or permissions.

### Anthropic Models Configured but Not Routed
`claude-sonnet-4-5` and `claude-opus-4-6` are configured in `src/lib/ai/providers/anthropic.ts` with pricing in `pricing.ts`, but the model router only uses OpenAI models. Anthropic models could be routed for content generation tasks.

## Wanted Features

### Publishing & Integrations
- Social media API integrations (publish directly to TikTok, Instagram, Twitter)
- Email campaign integration (Resend or SendGrid)
- Content scheduling with actual publishing (Buffer or Inngest job queue)
- Webhook-based status updates from platforms

### Content Quality
- A/B content testing with performance scoring
- Competitor content monitoring and analysis
- Trending topic integration for timely content
- Content performance analytics from platform APIs
- Multi-language content generation

### Collaboration
- Team collaboration with comments and approval workflows
- Role-based access control
- Content approval notifications (email/Slack)

### UX
- Content calendar drag-and-drop rescheduling
- Bulk content scheduling
- Content templates library
- Dark mode (next-themes is installed but may not be fully implemented)

### AI Improvements
- Route Anthropic models for specific task types (content generation, creative writing)
- Multi-model content comparison (generate with GPT-4o and Claude, let user pick)
- Automatic content pillar balancing suggestions
- Performance-based learning (feed real metrics back to improve content)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React 19)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │
│  │ Chat UI  │ │ Content  │ │Campaigns │ │ Dashboard/Analytics│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬───────────┘ │
└───────┼────────────┼────────────┼─────────────────┼─────────────┘
        │            │            │                 │
        ▼            ▼            ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                            │
│  /api/chat    /api/content/*   /api/campaigns/*   /api/usage    │
│  /api/brand/* /api/ideas       /api/suggestions   /api/analytics│
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │   Auth Layer      │  │         Org Resolution              │ │
│  │ Supabase SSR +    │  │ user.orgId → body → header →       │ │
│  │ API Key fallback  │  │ query → env → "default-org"        │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Orchestrator                               │
│                                                                  │
│  1. inferTaskType(message)     → keyword-based task classifier  │
│  2. routeTask(taskType)        → select GPT-4o or GPT-4o-mini  │
│  3. assembleContext(orgId, q)  → 5-part context builder         │
│  4. buildContextualPrompt()    → Mo system prompt + context     │
└──────────┬────────────────────────────┬─────────────────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────┐  ┌─────────────────────────────────────┐
│    AI SDK v6        │  │       Context Sources                │
│  streamText() →     │  │                                      │
│  UIMessageStream    │  │  Brand Profile  ← brandProfiles     │
│                     │  │  RAG Results    ← knowledgeChunks   │
│  Models:            │  │  Learnings      ← agentLearnings    │
│  - gpt-4o           │  │  Preferences    ← agentPreferences  │
│  - gpt-4o-mini      │  │  Current State  ← contentItems +    │
│  - text-embed-3-sm  │  │                   campaigns          │
└─────────────────────┘  └─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL + pgvector                   │
│                                                                  │
│  organizations    brandProfiles     contentItems    campaigns    │
│  userProfiles     calendarSlots     emailSequences  ideas       │
│  knowledgeDocuments / knowledgeChunks (+ 1536d embeddings)      │
│  agentLearnings / learningEmbeddings (+ 1536d embeddings)       │
│  performanceMetrics   approvalRequests   usageTracking          │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `APP_API_KEY` | Yes | Server-side API key for programmatic access |
| `APP_API_KEY_ORG_SLUG` | No | Org slug bound to the API key (default: `DEFAULT_ORG_SLUG`) |
| `DEFAULT_ORG_SLUG` | No | Fallback organization slug |
| `DEFAULT_ORG_NAME` | No | Fallback organization display name |
| `NEXT_PUBLIC_DEFAULT_ORG_SLUG` | No | Client-side default org slug |
| `NEXT_PUBLIC_DEFAULT_ORG_NAME` | No | Client-side default org name |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key (for admin operations) |
| `OPENAI_API_KEY` | Yes | OpenAI API key (GPT-4o, embeddings) |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (configured but not routed by default) |
| `BUFFER_ACCESS_TOKEN` | No | Buffer social scheduling (not yet implemented) |
| `RESEND_API_KEY` | No | Resend email service (not yet implemented) |
| `INNGEST_EVENT_KEY` | No | Inngest job queue (not yet implemented) |
| `INNGEST_SIGNING_KEY` | No | Inngest webhook verification (not yet implemented) |
