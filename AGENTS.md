# AGENTS.md

## Stack

- **Package manager:** `bun` 1.1.13 (workspaces). Never use `npm`/`pnpm`/`yarn`.
- **Monorepo tool:** Turborepo 2 -- `bun run dev` / `bun run build` / `bun run lint` / `bun run check-types`
- **TypeScript** 5.9.2

## Apps

| App | Stack | Notes |
|---|---|---|
| `apps/frontend` | TanStack React Start + Vite + Cloudflare Workers | Main app. NOT Next.js. Runs on `:3000`. SSR + tRPC + Drizzle. |
| `apps/server` | Plain Bun script | Minimal. `bun run index.ts` |
| `apps/telephony` | Node.js + Express + Twilio/XAI | Different stack (ts-node, npm). Voice agent. |

## Frontend (apps/frontend) -- key facts

- **TanStack React Start**, not Next.js. Uses `vite dev`, routing via TanStack Router, file-based routes in `src/routes/`.
- **tRPC** for API: routers in `trpc/routers/`. Uses `@trpc/tanstack-react-query`.
- **Auth:** `better-auth` with Drizzle adapter, restricted to `@darkalphacapital.com` emails. Config in `auth.ts`.
- **DB:** PostgreSQL + Drizzle ORM in `packages/db/`. Schema in `schema.ts`, migrations in `drizzle/`.
- **Cloudflare integration:** Deployed to Workers. Requires `wrangler login`. Remote bindings used in dev for Vectorize + Workflows. No local Vectorize emulator.
- **Workflows:** 7 Cloudflare Workflows (screen-deal, file-upload, cim-extraction, rag-ingestion, cim-screening, cim-monograph-screening, ic-scorer) defined in `wrangler.jsonc`, exported from `src/server.ts`.
- **Vectorize index:** `document-chunks` (768d, cosine). Namespaces per document, metadata filters for entity scoping. Index must exist on Cloudflare account before use.
- **Env:** Copy `apps/frontend/.env.example` → `.env`. Key vars: `DATABASE_URL`, `AUTH_SECRET`, `GTM_LEADS_API_KEY`, `INVESTOR_LEADS_API_KEY`, `DEAL_QUICK_ADD_API_KEY`, `VITE_PUBLIC_APP_URL`.
- **TanStack devtools:** Hidden by default. Enable with `VITE_ENABLE_TANSTACK_DEVTOOLS=true`, force-off with `VITE_DISABLE_TANSTACK_DEVTOOLS=true`.
- **Build:** `NODE_OPTIONS='--max-old-space-size=8192' vite build` then `wrangler deploy`.
- **Vite SSR:** All `@repo/*` packages are `noExternal`. `@repo/db` excluded from `optimizeDeps`.
- **Middleware:** Request middleware chain in `src/start.ts` (neon pool + bitrix-ai-widget gate).

## Database (packages/db)

- `drizzle-kit` for migrations. Drizzle config in `drizzle.config.ts`.
- Commands (run from repo root with `--cwd packages/db`):
  - `db:generate` -- creates migration
  - `db:migrate` -- applies pending
  - `db:push` -- dev only (no migration file)
  - `db:studio` -- Drizzle Studio
  - `db:seed:dummy-leads` / `db:seed:dummy-deal-pipeline` -- seed scripts
- All commands need `DATABASE_URL` in env.
- Exports: `"."`, `"./enums"`, `"./schema"`, `"./queries"`, `"./mutations"`, `"./types"`, `"./workflow-jobs"`, `"./worker-neon-context"`.

## Dev workflow

```sh
bun install
cp apps/frontend/.env.example apps/frontend/.env  # then edit DATABASE_URL
bun run --cwd packages/db db:migrate
bun run dev          # turbo dev -- starts frontend on :3000
bun run check-types  # turbo typecheck
bun run lint         # turbo lint
bun run format       # prettier across workspace
```

## Packages (workspace deps)

| Package | Import name | Entry |
|---|---|---|
| db | `@repo/db` | `packages/db/index.ts` |
| ai-core | `@repo/ai-core` | `packages/ai-core/index.ts` |
| schemas | `@repo/schemas` | `packages/schemas/index.ts` |
| rag-engine | `@repo/rag-engine` | `packages/rag-engine/index.ts` |
| bitrix-sync | `@repo/bitrix-sync` | `packages/bitrix-sync/src/index.ts` |
| deal-screening | `@repo/deal-screening` | ❓ check package.json |
| nextcloud | `@repo/nextcloud` | ❓ check package.json |
| redis-queue | `@repo/redis-queue` | `packages/redis-queue/src/index.ts` |
| cim-extraction | `@repo/cim-extraction` | ❓ check package.json |
| types | `types` (legacy name) | `packages/types/index.ts` |

## Gotchas

- **Frontend README `apps/frontend/README.md` is stale** -- says Next.js + Prisma, but code uses TanStack Start + Vite + Drizzle. Trust the config files.
- **No tests exist** in the entire repo. No test framework is configured.
- **No CI workflows** in `.github/workflows/`.
- **Telephony app** (`apps/telephony`) has its own stack (npm/ts-node/express). Does not use bun workspaces.
- **Old CLAUDE.md files** scattered in packages with generic "use Bun instead of Node" boilerplate -- largely noise.
- **Global `@types/react` override** pinned to 19.2.7 across all packages.
- **OpenCode override:** `@ai-sdk/provider-utils` forced to 4.0.20.
