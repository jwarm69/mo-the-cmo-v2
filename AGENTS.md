# AGENTS.md — Mo the CMO AI Agent Architecture

## Overview

Mo is a single-agent system with a contextual prompt pipeline. Every user interaction flows through: **context assembly → task inference → model selection → streaming generation → learning extraction**.

## Model Router

**File**: `src/lib/ai/model-router.ts`

Routes tasks to the appropriate model based on keyword inference from the user's message.

### Task Types and Model Assignment

| Task Type | Model | Trigger Keywords |
|-----------|-------|------------------|
| `strategy` | GPT-4o | "strategy", "plan", "go-to-market", "positioning" |
| `campaign_planning` | GPT-4o | "campaign" |
| `weekly_report` | GPT-4o | "report", "weekly update", "performance summary" |
| `analysis` | GPT-4o | "analy", "metrics", "kpi" |
| `content_writing` | GPT-4o | "write", "caption", "script", "content" |
| `email_sequence` | GPT-4o | "email", "sequence" |
| `ad_copy` | GPT-4o | "ad copy", "headline", "ad creative" |
| `chat` | GPT-4o | Default fallback |
| `bulk_variations` | GPT-4o-mini | "variation", "bulk", "multiple versions" |
| `hashtags` | GPT-4o-mini | "hashtag" |
| `reformatting` | GPT-4o-mini | "rewrite", "reformat", "repurpose" |

Keywords are checked in order; first match wins. The `inferTaskType()` function handles classification.

### Available Providers

- **OpenAI** (`src/lib/ai/providers/openai.ts`): `gpt-4o`, `gpt-4o-mini`, `text-embedding-3-small`
- **Anthropic** (`src/lib/ai/providers/anthropic.ts`): `claude-sonnet-4-5-20250929`, `claude-opus-4-6` (configured but not yet routed by default)

## Orchestrator

**File**: `src/lib/ai/orchestrator.ts`

The orchestrator is the entry point for every AI interaction. It:

1. Infers the task type from the user message
2. Routes to the appropriate model
3. Builds the contextual system prompt

```
orchestrate(userMessage, context) → { systemPrompt, taskType, model }
```

The orchestrator returns the assembled prompt and model; the calling route handler (e.g., `/api/chat`) handles streaming and usage tracking.

## System Prompt

**File**: `src/lib/ai/prompts/system.ts`

### Mo's Identity

Mo is defined as a "strategic, data-driven marketing expert" with these traits:
- Confident but collaborative
- Direct and concise
- Creative but grounded
- Always learning from past performance

### Capabilities

1. Content creation (platform-specific)
2. Campaign strategy
3. Performance analysis
4. Brand voice maintenance
5. Calendar management

### Platform Templates

The `PLATFORM_TEMPLATES` record defines formatting rules per platform:

| Platform | Format | Key Constraints |
|----------|--------|-----------------|
| **TikTok** | Video script (9:16) | Hook (1-3s), body (15-45s), CTA (3-5s), under 60s total |
| **Instagram** | Post/Reel/Carousel | Hook in first caption line, 5-10 hashtags, 5-7 carousel slides |
| **Twitter** | Tweet/Thread | 280 char limit, numbered threads, 1-3 hashtags |
| **Email** | Marketing email | Subject <50 chars, mobile-first, one main CTA, under 200-500 words |
| **Blog** | Long-form | SEO title <60 chars, H2/H3 every 200-300 words, 800-1500 words |

### Contextual Prompt Assembly

`buildContextualPrompt()` appends sections to Mo's base prompt in this order:

1. **Brand Context** — name, voice, tone, pillars, audience, guidelines, competitors, hashtags
2. **Current State** — recent content items, active campaigns, pillar balance with target deviation warnings
3. **Knowledge Base Context** — top-k RAG results from uploaded documents
4. **Learnings** — validated insights from past interactions (with confidence/weight)
5. **User Preferences** — explicit and inferred preferences (with strength scores)

## Learning Loop

**Files**: `src/lib/memory/long-term.ts`, `src/app/api/chat/route.ts`

Mo learns from user interactions in two ways:

### Implicit Correction Detection

The chat route checks every user message against regex patterns:
- `actually`, `no,`, `wrong`, `instead`, `don't`, `never`, `always`, `remember`

If matched (and not an explicit memory command), a learning is stored:
- Type: `user_correction`
- Confidence: `medium`
- Weight: `2.0`

### Explicit Memory Commands

Messages starting with `remember:`, `note:`, or `learn:` trigger direct learning storage:
- Type: `explicit_preference`
- Confidence: `high`
- Weight: `3.0`

### Learning Retrieval

`getRelevantLearnings()` uses two strategies:
1. **Vector search** (primary): Embeds the query, performs pgvector cosine similarity against `learning_embeddings`
2. **Recency fallback**: If vector search fails, fetches recent learnings sorted by confidence weight

### Learning Types (DB enum)

- `performance_feedback` — from metrics data
- `user_correction` — implicit correction detection
- `explicit_preference` — "remember:" commands
- `ab_test_result` — from A/B testing (future)
- `pattern_recognition` — system-detected patterns

### Confidence Levels

`low` (weight 1) → `medium` (weight 2) → `high` (weight 3) → `validated` (weight 4)

## RAG Pipeline

**Files**: `src/lib/rag/ingest.ts`, `src/lib/rag/search.ts`, `src/lib/rag/context.ts`, `src/lib/rag/cache.ts`

### Ingestion Flow

1. Document uploaded via `/api/brand/knowledge/upload` (supports PDF, DOCX, plain text via `src/lib/knowledge/parsers.ts`)
2. `ingestDocument()` chunks text: **1000 chars per chunk, 200 char overlap**
3. Each chunk embedded via OpenAI `text-embedding-3-small` (1536 dimensions)
4. Chunks + embeddings stored in `knowledge_chunks` table

### Search Flow

1. User message embedded via same model
2. pgvector cosine similarity: `1 - (embedding <=> query_vector)`
3. Results joined with `knowledge_documents` for document title
4. Top-k results (default 5) returned

### Context Assembly

`assembleContext()` in `src/lib/rag/context.ts` runs all context fetches in parallel:
- Brand profile lookup + normalization
- Knowledge base semantic search
- Relevant learnings (vector or recency)
- Active preferences
- Current state (recent content, active campaigns, pillar distribution with target deviation)

## Usage and Pricing

**Files**: `src/lib/usage/pricing.ts`, `src/lib/usage/tracker.ts`

### Cost Tracking

Every API call records token usage per route. Costs calculated per model:

| Model | Input (¢/1M tokens) | Output (¢/1M tokens) |
|-------|---------------------|----------------------|
| gpt-4o | 250 | 1000 |
| gpt-4o-mini | 15 | 60 |
| text-embedding-3-small | 2 | 0 |
| claude-sonnet-4-5 | 300 | 1500 |

### Usage Limits

- Supabase-authenticated users: configurable via `user_profiles.usage_limit_cents` (default $0.50)
- API key users: no limit (`usageLimitCents = 0`)
- Checked before every chat request; returns 429 when exceeded
