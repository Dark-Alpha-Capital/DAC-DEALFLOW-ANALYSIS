# AGENTS.md

## Stack

- **Package manager:** `bun` 1.1.13 (workspaces). Never use `npm`/`pnpm`/`yarn` as the root install command.
- **Monorepo tool:** Turborepo 2 — `bun run dev` / `bun run build` / `bun run lint` / `bun run check-types`
- **TypeScript** 5.9.2

## Apps

| App | Stack | Notes |
|---|---|---|
| `apps/frontend` | TanStack React Start + Vite + CF Workers | Main deal-flow app. Port `:3000`. tRPC + Drizzle + Vectorize. |
| `apps/project-trackers` | TanStack React Start + Vite + CF Workers | Deal/project tracking + kickoff screening. Port `:3001`. |
| `apps/telephony` | Node.js + Express + Twilio/XAI | Voice agent. Uses npm, not bun (`ts-node`, `nodemon`). Not in bun workspaces. |

## Frontend (apps/frontend)

- **TanStack React Start**, not Next.js. `vite dev`, file-based routes in `src/routes/`.
- **tRPC** API: routers in `trpc/routers/`. Uses `@trpc/tanstack-react-query`.
- **Auth:** `better-auth` with Drizzle adapter (`provider: "sqlite"`), restricted to `@darkalphacapital.com` emails.
- **DB:** Cloudflare **D1** (`dealflow-db`) + Drizzle ORM via `@repo/db`. **No local DB** — dev hits remote D1 (`remote: true`).
- **Vectorize:** `document-chunks` (768d, cosine) — live index in dev via `remoteBindings: true`.
- **Workflows:** 8 Cloudflare Workflows exported from `src/server.ts` (screen-deal, file-upload, cim-extraction, rag-ingestion, cim-screening, cim-monograph-screening, ic-scorer, project-kickoff-screen).
- **Files:** Nextcloud (not R2).
- **Env:** Copy `.env.example` → `.env`. Key vars: `AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_PUBLIC_APP_URL`.
- **Build:** `NODE_OPTIONS='--max-old-space-size=8192' vite build` then `wrangler deploy`.
- **Production domain:** `dealflow.darkalphacapital.com`
- **Lint:** `bun run --cwd apps/frontend lint` (eslint)

## Project Trackers (apps/project-trackers)

- Same stack as frontend (TanStack React Start + Vite + CF Workers), separate deployment.
- **DB:** Cloudflare **D1** (`project-trackers-db`) + Drizzle ORM via `@repo/db-tracker`. Separate schema and migrations from frontend.
- **1 Workflow:** `ProjectKickoffScreenWorkflow` (tracker-kickoff-screen).
- Uses `@repo/ai-core`, `@repo/enums`, `@repo/schemas` — no Vectorize, no Nextcloud.
- **Production domain:** `tracker.darkalphacapital.com`
- **Migrations:** `bun run --cwd packages/db-tracker db:generate` then `wrangler d1 migrations apply project-trackers-db --remote`

## Database packages

| Package | D1 database | Used by |
|---|---|---|
| `@repo/db` | `dealflow-db` | `apps/frontend` |
| `@repo/db-tracker` | `project-trackers-db` | `apps/project-trackers` |

- Both use Drizzle ORM with SQLite dialect. Migrations in `drizzle/` subdirs.
- **Migrations apply remote:** `bun run --cwd apps/<app> db:migrate:remote`
- **Outside Workers:** no DB binding available. Use `wrangler d1 execute <db-name> --remote` for ad-hoc SQL.
- `@repo/db` exports: `"."`, `"./enums"`, `"./schema"`, `"./queries"`, `"./mutations"`, `"./types"`, `"./types-only"`, `"./workflow-jobs"`, `"./d1-context"`, `"./create-db"`
- `@repo/db-tracker` exports: `"."`, `"./enums"`, `"./schema"`, `"./queries"`, `"./mutations"`, `"./workflow-jobs"`, `"./d1-context"`, `"./create-db"`
- Postgres migrations archived in `packages/db/drizzle-pg-archive/`. The `docker-compose.yml` (pgvector) is for this archived path only — not used by the current app.

## Dev workflow

```sh
bun install
cp apps/frontend/.env.example apps/frontend/.env
bunx wrangler login
bash apps/frontend/scripts/setup-cloudflare.sh   # once per account
bun run --cwd apps/frontend dev
```

For project-trackers: `bun run --cwd apps/project-trackers dev` (port 3001). For telephony: `cd apps/telephony && npm install && npm run dev`.

## Telephony (apps/telephony)

- **Not** in bun workspaces. Uses npm + `ts-node` + `nodemon`.
- Start: `npm run dev` (or `npm run start`). Outbound: `npm run outbound`.
- Has its own `.env` and `tsconfig.json` (CommonJS). Does not share any workspace packages.
- `cd apps/telephony && npm install` before first run.

## Gotchas

- **No tests / no CI workflows** in repo.
- **Frontend README is stale** (says Next.js + Prisma). Trust this file and `SETUP_LOCAL.md` instead.
- **Two separate D1 databases** — frontend and project-trackers do NOT share a DB. Migrations must go to the correct database.
- **Worker bundle size:** free tier 3 MiB gzip limit may block deploy.
- **`packageManager` is set to `bun@1.1.13`** — running `npm install` at the root will fail.
- **Telephony must be set up independently** (`cd apps/telephony && npm install`).
