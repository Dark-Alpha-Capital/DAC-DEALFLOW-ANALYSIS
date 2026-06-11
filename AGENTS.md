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
- **Auth:** `better-auth` with Drizzle adapter (`provider: "sqlite"`), restricted to `@darkalphacapital.com` emails. Config in `auth.ts`.
- **DB:** Cloudflare **D1** (SQLite) + Drizzle ORM in `packages/db/`. **No local DB** — dev uses **remote D1** via Wrangler (`d1_databases` + `remote: true`, Vite `remoteBindings: true`).
- **Files:** Nextcloud (not R2) for document storage.
- **Cloudflare:** Firm account (`account_id` in `wrangler.jsonc`). `bun run dev` hits live D1, Vectorize, and Workflows on the logged-in account.
- **Workflows:** 8 workflows in `wrangler.jsonc`, exported from `src/server.ts`.
- **Vectorize:** `document-chunks` (768d, cosine).
- **Env:** Copy `apps/frontend/.env.example` → `.env`. Key vars: `AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_PUBLIC_APP_URL`.
- **Build:** `NODE_OPTIONS='--max-old-space-size=8192' vite build` then `wrangler deploy`.
- **Middleware:** `src/start.ts` — D1 ALS middleware + bitrix-ai-widget gate.

## Database (packages/db)

- `drizzle-kit` for migrations. SQLite dialect; migrations in `drizzle/`.
- Commands (`--cwd packages/db`):
  - `db:generate` — new migration SQL
  - Remote apply: `bun run --cwd apps/frontend db:migrate:remote`
- Workers: `@repo/db` `db` via ALS + `env.DB`. CLI outside Workers has no DB — use `runDbWithD1` or `wrangler d1`.
- Exports: `"."`, `"./enums"`, `"./schema"`, `"./queries"`, `"./mutations"`, `"./types"`, `"./workflow-jobs"`, `"./d1-context"`, `"./create-db"`.

## Dev workflow

```sh
bun install
cp apps/frontend/.env.example apps/frontend/.env
bunx wrangler login
bash apps/frontend/scripts/setup-cloudflare.sh   # once per account
bun run dev   # remote D1 + Vectorize + Workflows
```

## Gotchas

- **Frontend README is stale** (says Next.js + Prisma).
- **No tests / no CI workflows** in repo.
- **Worker bundle size:** free tier 3 MiB gzip limit may block deploy.
- **Postgres migrations** archived in `packages/db/drizzle-pg-archive/`.
