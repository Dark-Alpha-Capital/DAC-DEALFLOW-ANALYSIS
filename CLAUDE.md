# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Turborepo monorepo for **Dark Alpha Capital's Deal Sourcing and Due Diligence Platform**. The platform serves a private equity firm with two primary workflows:

### 1. Deal Screening (Web-Scraped Deals)
Deals are automatically scraped from the internet and ingested into the system. The platform then:
- Analyzes each deal against Dark Alpha Capital's internal investment criteria
- Runs AI-powered screeners to evaluate compatibility with the firm's parameters
- Flags compatible deals and notifies relevant employees
- Allows manual review, tagging, and publishing of promising deals

### 2. Due Diligence (Active Companies)
For deals that have progressed and are actively being worked on, employees can:
- Add companies to the system with detailed information
- Upload due diligence documents (financials, P&L statements, balance sheets, employee info, etc.)
- Use RAG-powered Q&A to analyze documents and answer investor questions
- Track due diligence sections, tasks, and reviews
- Automate the entire due diligence workflow

## Technology Stack

- **Runtime & Package Manager**: Bun
- **Monorepo**: Turborepo
- **Frontend**: Next.js 16 with App Router, Turbopack, React 19
- **Authentication**: Better Auth
- **Database**: PostgreSQL
- **ORM**: Drizzle
- **Background Jobs**: BullMQ (Redis-based job queue) with worker service on Google Cloud Run
- **Real-time**: Server-Sent Events (SSE) for job progress updates
- **AI**: Google Gemini API, OpenAI API (Vercel AI SDK)
- **File Storage**: Google Cloud Storage
- **Vector Search**: Pinecone

## Common Commands

```bash
# Install dependencies (from root)
bun install

# Development - run all apps
bun run dev

# Development - run specific app
bun run dev --filter=bitrix-deal-sourcing  # frontend
bun run dev --filter=backend
bun run dev --filter=worker
bun run dev --filter=ws

# Build all apps
bun run build

# Build specific app
bun run build --filter=bitrix-deal-sourcing

# Linting
bun run lint

# Type checking
bun run check-types

# Format code
bun run format
```

### Drizzle Commands (run from packages/db)

```bash
# Generate Drizzle migrations
bunx drizzle-kit generate

# Run migrations
bunx drizzle-kit migrate

# Open Drizzle Studio
bunx drizzle-kit studio
```

## Architecture

### Apps

- **frontend** (`apps/frontend`): Next.js 16 app with App Router, Turbopack, and React 19. Main deal sourcing UI with authentication via Better Auth.
- **backend** (`apps/backend`): Hono server running on Bun. Lightweight API for basic queries.
- **worker** (`apps/worker`): BullMQ worker service for background jobs (AI screening, file uploads). Includes HTTP health check server for Cloud Run. Deployed to Google Cloud Run.

### Packages

- **db** (`packages/db`): Drizzle schema and database client. PostgreSQL database with all models (User, Deal, Company, etc.). Exports typed queries and mutations.
- **types** (`packages/types`): Shared TypeScript types across apps.
- **ui** (`packages/ui`): Shared React component library.
- **eslint-config** (`packages/eslint-config`): Shared ESLint configuration.
- **typescript-config** (`packages/typescript-config`): Shared TypeScript configurations.

### Key Patterns

**Database Access**: Import from `db` package:
```typescript
import db from "db";
import { GetDealById, GetAllDeals } from "db/queries";
import { updateDeal, createDeal } from "db/mutations";
```

**Frontend Server Actions**: Located in `apps/frontend/lib/actions/`. Use Next.js `"use server"` directive.

**Caching**: Frontend queries use Next.js `"use cache"` directive with `cacheTag` and `cacheLife` from `next/cache`.

**Background Jobs with BullMQ**: Jobs are queued from the frontend using BullMQ Queue.add() and processed by the worker service.
```typescript
// Frontend: Adding a job
import { screenDealQueue } from "@/lib/queue-client";
await screenDealQueue.add("screen", { dealId, screenerId, userId }, { jobId });

// Worker: Processing jobs (handlers/screen-deal-handler.ts)
export async function screenDealHandler(job: Job) {
  await job.updateProgress({ step: "Processing chunk 1/5", percentage: 20 });
  // ... process job
}
```

**Real-time Job Progress**: Frontend uses Server-Sent Events (SSE) to stream job progress updates.
```typescript
// Hook for single job progress
const { progress, isComplete, step, percentage } = useJobProgress(jobId);

// Hook for multiple jobs
const { progressMap, allJobs, completedJobs } = useMultiJobProgress(jobIds);

// SSE endpoint: /api/jobs/[jobId]/progress
```

### Services & External Dependencies

- **PostgreSQL**: Primary database (via Drizzle ORM)
- **Redis**: BullMQ job queue and job state storage
- **BullMQ**: Background job processing with progress tracking
- **Google Cloud Storage**: File uploads
- **Pinecone**: Vector database for semantic search
- **Google Gemini**: AI for deal screening and document analysis
- **OpenAI**: Additional AI capabilities

### Deployment

Backend services deploy to Google Cloud Run via GitHub Actions (`.github/workflows/`). Frontend deploys to Vercel.

## Environment Variables

Required env vars are defined in `turbo.json` build task. Each app has `.env.example` files.

Key variables:
- `DATABASE_URL`, `DIRECT_URL`: PostgreSQL connection strings
- `REDIS_URL`: Redis connection (used by BullMQ for job queues)
- `BETTER_AUTH_SECRET`: Better Auth secret
- `GCLOUD_*`: Google Cloud credentials (project ID, bucket, service account)
- `GOOGLE_AI_API_KEY`: Google Gemini API key
- `AI_API_KEY`: OpenAI API key

## Worker Architecture

The worker service (`apps/worker`) uses BullMQ for background job processing with the following structure:

### Job Queues

| Queue Name | Purpose | Handler |
|------------|---------|---------|
| `screen-deal` | AI screening of deals against screeners | `handlers/screen-deal-handler.ts` |
| `file-upload` | File upload processing | `handlers/file-upload-handler.ts` |

### Worker File Structure

```
apps/worker/
├── index.ts                    # Entry point: health check server + worker init
├── handlers/
│   ├── screen-deal-handler.ts  # Screen deal job processor
│   └── file-upload-handler.ts  # File upload job processor
└── lib/
    ├── bullmq-connection.ts    # ioredis connection for BullMQ
    ├── queues.ts               # Queue definitions and types
    └── actions/
        └── evaluate-deal.ts    # Deal evaluation with progress callbacks
```

### Progress Tracking

Jobs report step-based progress updates:
```typescript
// Screen deal progress steps:
"Fetching deal information" (5%)
"Fetching screener" (10%)
"Splitting content into chunks" (15%)
"Processing chunk 1/N" (15-75%)
"Generating final summary" (80%)
"Saving results to database" (95%)
"Completed" (100%)
```

### Adding New Job Types

1. Create a handler in `apps/worker/handlers/`:
```typescript
import { Job } from "bullmq";

export async function myJobHandler(job: Job<MyJobData>) {
  await job.updateProgress({ step: "Starting", percentage: 0 });
  // ... process job
  await job.updateProgress({ step: "Completed", percentage: 100 });
  return { success: true };
}
```

2. Add queue in `apps/worker/lib/queues.ts`:
```typescript
export const QUEUE_NAMES = {
  // ...existing queues
  MY_QUEUE: "my-queue",
} as const;
```

3. Register worker in `apps/worker/index.ts`:
```typescript
const myWorker = new Worker(QUEUE_NAMES.MY_QUEUE, myJobHandler, { connection });
```

4. Add queue client in `apps/frontend/lib/queue-client.ts` to enqueue jobs from frontend
