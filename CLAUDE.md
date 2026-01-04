# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Turborepo monorepo for a deal sourcing and due diligence platform. It uses Bun as the package manager and runtime.

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

### Prisma Commands (run from apps/frontend or packages/db)

```bash
# Generate Prisma client
bunx prisma generate --schema=../../packages/db/prisma/schema.prisma

# Run migrations
bunx prisma migrate dev --schema=../../packages/db/prisma/schema.prisma

# Open Prisma Studio
bunx prisma studio --schema=../../packages/db/prisma/schema.prisma
```

## Architecture

### Apps

- **frontend** (`apps/frontend`): Next.js 16 app with App Router, Turbopack, and React 19. Main deal sourcing UI with authentication via NextAuth.
- **backend** (`apps/backend`): Hono server running on Bun. Lightweight API for basic queries.
- **worker** (`apps/worker`): Express server for background jobs (AI screening, file uploads). Deployed to Google Cloud Run.
- **ws** (`apps/ws`): WebSocket server using Bun's native WebSocket support. Handles real-time job updates via Redis pub/sub.

### Packages

- **db** (`packages/db`): Prisma schema and client. PostgreSQL database with all models (User, Deal, Company, etc.). Exports singleton client and typed queries/mutations.
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

**Real-time Updates**: Worker publishes to Redis channel "job-updates", WebSocket server subscribes and forwards to clients.

### Services & External Dependencies

- **PostgreSQL**: Primary database (via Prisma)
- **Redis**: Job queue and pub/sub for real-time updates
- **Google Cloud Storage**: File uploads
- **Google Cloud Pub/Sub**: Background job queuing
- **Pinecone**: Vector database for semantic search
- **AI SDKs**: OpenAI and Google AI for deal screening

### Deployment

Backend services deploy to Google Cloud Run via GitHub Actions (`.github/workflows/`). Frontend deploys to Vercel.

## Environment Variables

Required env vars are defined in `turbo.json` build task. Each app has `.env.example` files.

Key variables:
- `DATABASE_URL`, `DIRECT_URL`: PostgreSQL connection strings
- `REDIS_URL`: Redis connection
- `AUTH_SECRET`: NextAuth secret
- `GCLOUD_*`: Google Cloud credentials
- `AI_API_KEY`: AI service API key
