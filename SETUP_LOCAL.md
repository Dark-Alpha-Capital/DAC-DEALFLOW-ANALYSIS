# Local Development Setup

This guide helps contributors run the project locally **without** a Cloudflare account.

## Overview

The project runs as a Cloudflare Worker in production, with these Cloudflare services:
- **Workflows** — async job processing (deal screening, CIM extraction, RAG ingestion, etc.)
- **Vectorize** — vector similarity search for document RAG
- **Neon PostgreSQL** — serverless Postgres via WebSockets

Local development replaces these with:
- **PostgreSQL via Docker** (instead of Neon)
- **pgvector** (instead of Cloudflare Vectorize)
- **Workflows disabled** — workflow triggers log warnings and mark jobs as failed (workflow logic requires the Workers runtime)

## Prerequisites

- **[Bun](https://bun.sh/)** 1.1.13+
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (for PostgreSQL)
- **Node.js** 18+ (required by some dependencies)
- **API keys** for external services (OpenAI, Google AI, Resend, Nextcloud, etc.)

## Quick Start

### 1. Clone and install

```sh
git clone <repo-url>
cd bitrix-monorepo
bun install
```

### 2. Start PostgreSQL

```sh
docker compose up -d
```

This starts a PostgreSQL 17 container with the pgvector extension at `localhost:5432`.

Credentials:
- **User:** `dealflow`
- **Password:** `dealflow`
- **Database:** `dealflow`

### 3. Configure environment

```sh
cp apps/frontend/.env.example apps/frontend/.env
```

Edit `apps/frontend/.env` and fill in the required values:

```env
# Required — local PostgreSQL connection
DATABASE_URL=postgres://dealflow:dealflow@localhost:5432/dealflow

# Required — enables local dev mode (skips Cloudflare Vite plugin)
LOCAL_DEV=true

# Required — AI provider API keys (at least one)
AI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Required for auth
AUTH_SECRET=<generate-a-random-secret>
AUTH_GOOGLE_ID=<google-oauth-client-id>
AUTH_GOOGLE_SECRET=<google-oauth-client-secret>
RESEND_API_KEY=<resend-api-key>

# Optional — only needed for features that use these services
NEXTCLOUD_URL=https://...
NEXTCLOUD_USER=...
NEXTCLOUD_PASSWORD=...
BITRIX24_WEBHOOK=https://...
BITRIX_SECRET_KEY=...
```

### 4. Initialize the database

Run migrations to create all tables:

```sh
bun run --cwd packages/db db:migrate
```

Then set up the pgvector extension and vector table:

```sh
docker compose exec -T postgres psql -U dealflow -d dealflow < packages/db/local-setup/document-chunk-vectors.sql
```

### 5. (Optional) Seed data

```sh
bun run --cwd packages/db db:seed:dummy-leads
bun run --cwd packages/db db:seed:dummy-deal-pipeline
```

### 6. Start the dev server

```sh
# Or from the frontend directory directly
bun run --cwd apps/frontend dev:local
```

The app runs at **http://localhost:3000**.

## What Works Locally

| Feature | Status | Notes |
|---|---|---|
| **UI / Frontend** | Full | All pages, components, tRPC routes |
| **Authentication** | Full | Google OAuth + email/password (requires `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`) |
| **Database (CRUD)** | Full | Deals, screenings, users, etc. all work with local PostgreSQL |
| **File upload** | Partial | Uploads work; Nextcloud required for storage |
| **RAG / Document search** | Full | pgvector replaces Cloudflare Vectorize for embeddings |
| **AI features** | Full | Chat, screening tools — all LLM calls go directly to OpenAI/Google |
| **Workflows** | No | Cloudflare Workflows cannot run outside the Workers runtime. Triggering a workflow marks it as "failed" with a warning in the console. |

## What Does NOT Work Locally

- **Cloudflare Workflows** — The 7 background workflows (screen-deal, file-upload, cim-extraction, rag-ingestion, cim-screening, cim-monograph-screening, ic-scorer) will not execute. The UI will show these jobs as failed.
- **Cloudflare Vectorize** — Replaced by pgvector. No production Vectorize index access.
- **Cloudflare deploy** — `wrangler deploy` requires a Cloudflare account.

## Architecture for Local Dev

When `LOCAL_DEV=true`:

1. **Vite config** skips the `@cloudflare/vite-plugin`. The app runs as a standard Vite/Node.js dev server instead of inside the Workers runtime (Workerd).

2. **Database** uses the standard `postgres` TCP driver (via `@repo/db`). The Workers-specific Neon/WebSocket path is automatically skipped because `isCloudflareWorkersRuntime()` returns `false` on Node.js.

3. **Vectorize** is replaced by pgvector. The file `lib/document-chunk-vectorize.local.ts` handles embedding upserts, queries, and deletes using a local `DocumentChunkVector` table with a `vector(768)` column.

4. **Workflows** trigger functions (`startScreenDealWorkflow`, etc.) are replaced by no-op stubs from `src/lib/workflow-jobs-api.local.ts` that log a warning and mark the job as failed.

## Docker Commands

```sh
# Start PostgreSQL
docker compose up -d

# Stop PostgreSQL (keeps data)
docker compose down

# Stop and delete all data
docker compose down -v

# Connect to database shell
docker compose exec postgres psql -U dealflow -d dealflow
```

## Switching Between Local and Cloudflare Mode

- **Local mode:** Set `LOCAL_DEV=true` in `.env` and run `bun run dev` or `bun run --cwd apps/frontend dev:local`
- **Cloudflare mode (requires CF account):** Remove or set `LOCAL_DEV=false`, run `wrangler login`, then `bun run dev`

## Troubleshooting

### `DATABASE_URL is required`
Make sure `DATABASE_URL` is set in `apps/frontend/.env`.

### `relation "DocumentChunkVector" does not exist`
Run the pgvector setup SQL:
```sh
docker compose exec -T postgres psql -U dealflow -d dealflow < packages/db/local-setup/document-chunk-vectors.sql
```

### `extension "vector" is not available`
Make sure you're using the `pgvector/pgvector:pg17` Docker image. Regular `postgres:17` does not include pgvector.

### `bun: command not found`
Install Bun: `curl -fsSL https://bun.sh/install | bash`

### Docker container won't start
- Check if port 5432 is already in use: `lsof -i :5432`
- On macOS, make sure Docker Desktop is running

### Auth redirects to wrong URL
Set `BETTER_AUTH_URL=http://localhost:3000` in your `.env` file.
