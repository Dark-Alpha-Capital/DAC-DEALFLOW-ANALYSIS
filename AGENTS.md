# AGENTS.md

## Stack

- **Package manager:** `bun` 1.3.14 (workspaces). Never use `npm`/`pnpm`/`yarn` as the root install command.
- **Monorepo tool:** Turborepo 2 — `bun run dev` / `bun run build` / `bun run lint`
- **TypeScript** 5.9.2
- **Tailwind** v4 (CSS-first config via `@tailwindcss/vite`, no `tailwind.config.ts`)
- **React** 19.2.3 (frontend) / 19.x (project-trackers)
- **No root tsconfig or eslint config** — per-package only.
- **No `check-types`** — the turbo pipeline exists but no package implements a `check-types` script.
- **Canonical skills dir:** `.agents/skills/`. `.claude/skills/` and `.cursor/skills/` are symlinks into it.
- **AI SDK version overrides** in root `package.json` (`overrides` field) — all `@ai-sdk/*` packages pinned to specific versions. Update there, not in sub-packages.

## Apps

| App | Stack | Notes |
|---|---|---|
| `apps/frontend` | TanStack React Start + Vite + CF Workers | Main deal-flow app. Port `:3000`. tRPC + Drizzle + Vectorize. |
| `apps/project-trackers` | TanStack React Start + Vite + CF Workers | Deal/project tracking + kickoff screening. Port `:3001`. |
| `apps/telephony` | Node.js + Express + Twilio | Voice agent. Uses npm, not bun (`ts-node`, `nodemon`). Not in bun workspaces. |

## Workspace packages (14 total)

| Package | Purpose |
|---|---|
| `@repo/db` | D1 `dealflow-db` Drizzle ORM (frontend) |
| `@repo/db-tracker` | D1 `project-trackers-db` Drizzle ORM (project-trackers) |
| `@repo/enums` | Shared enums (project-management: cycles, epics, initiatives, work items, etc. — used by schemas, db-tracker, project-trackers) |
| `@repo/schemas` | Shared zod schemas |
| `@repo/ai-core` | AI provider wrappers |
| `@repo/eslint-config` | Shared ESLint configs |
| `@repo/typescript-config` | Shared TS config (`base.json`, `react-library.json`, `nextjs.json` — note: `nextjs.json` is a stale Next.js leftover) |
| `types` | Shared types package (not `@repo/types` — import as `types`. Frontend uses `"file:../../packages/types"` not workspace protocol) |
| `@repo/deal-screening` | Deal screening logic |
| `@repo/bitrix-sync` | Bitrix24 CRM sync |
| `@repo/redis-queue` | Redis-backed queue |
| `@repo/nextcloud` | Nextcloud file storage client |
| `@repo/rag-engine` | RAG ingestion/query engine |
| `@repo/cim-extraction` | CIM document extraction |

## Frontend (`apps/frontend`)

- **TanStack React Start**, not Next.js. `vite dev`, file-based routes in `src/routes/`.
- **tRPC** API: routers in `trpc/routers/`. Uses `@trpc/tanstack-react-query`.
- **Auth:** `better-auth` with Drizzle adapter (`provider: "sqlite"`), restricted to `@darkalphacapital.com` emails. Admin emails hardcoded in `lib/utils.ts`.
- **DB:** Cloudflare **D1** (`dealflow-db`) + Drizzle ORM via `@repo/db`. **No local DB** — dev hits remote D1 (`remote: true`). Dev also uses `@cloudflare/vite-plugin` for remote bindings.
- **Vectorize:** `document-chunks` (768d, cosine) — live index in dev via `remoteBindings: true`.
- **Workflows:** 7 Cloudflare Workflows exported from `src/server.ts` (screen-deal, file-upload, cim-extraction, rag-ingestion, cim-screening, cim-monograph-screening, ic-scorer).
- **Files:** Nextcloud (not R2).
- **Compat flag:** `nodejs_compat` only.
- **React Compiler:** `babel-plugin-react-compiler` in both root and frontend deps — used as a Vite plugin.
- **Env:** Copy `.env.example` → `.env`. Key vars: `AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_PUBLIC_APP_URL`.
- **Build:** `NODE_OPTIONS='--max-old-space-size=8192' vite build` then `wrangler deploy`.
- **Production domain:** `dealflow.darkalphacapital.com`
- **Lint:** `bun run --cwd apps/frontend lint` (eslint flat config: `eslint.config.mjs`). Ignore stale `.eslintrc.json` (Next.js leftover).
- **Prettier:** `prettier-plugin-tailwindcss` in effect (config at `apps/frontend/.prettierrc`).
- **`deploy` script does NOT run migrations** — run `db:migrate:remote` separately before deploy.

### Stale Next.js artifacts (do not trust or follow)

- `.eslintrc.json` references `next/core-web-vitals` and `next/typescript`
- `.gitignore` references `.next/`, `next-env.d.ts`
- `turbo.json` build outputs include `.next/**`
- Frontend README says Next.js + Prisma — trust this file and `SETUP_LOCAL.md` instead.
- `packages/typescript-config/nextjs.json` has a Next.js plugin — no package uses it.

## Project Trackers (`apps/project-trackers`)

- Same stack as frontend (TanStack React Start + Vite + CF Workers), separate deployment.
- **DB:** Cloudflare **D1** (`project-trackers-db`) + Drizzle ORM via `@repo/db-tracker`. Separate schema and migrations from frontend.
- **1 Workflow:** `ProjectKickoffScreenWorkflow` (tracker-kickoff-screen).
- Uses `@repo/ai-core`, `@repo/enums`, `@repo/schemas` — no Vectorize, no Nextcloud.
- **Compat flags:** `nodejs_compat` + `nodejs_compat_populate_process_env`.
- **Production domain:** `projects.darkalphacapital.com` (wrangler.jsonc vars). `tracker.darkalphacapital.com` also resolves.
- **Migrations:** `bun run --cwd packages/db-tracker db:generate` then `wrangler d1 migrations apply project-trackers-db --remote`
- **`deploy` script runs migrations before build**, unlike frontend.
- **No eslint config** — linting is frontend-only.

## Database packages

| Package | D1 database | Used by |
|---|---|---|
| `@repo/db` | `dealflow-db` | `apps/frontend` |
| `@repo/db-tracker` | `project-trackers-db` | `apps/project-trackers` |

- Both use Drizzle ORM with SQLite dialect. Migrations in `drizzle/` subdirs.
- **Migrations apply remote:** `bun run --cwd apps/<app> db:migrate:remote`
- **Outside Workers:** no DB binding available. Use `wrangler d1 execute <db-name> --remote` for ad-hoc SQL.
- **Seed scripts:** `bun run --cwd packages/db db:seed:dummy-leads` and `db:seed:dummy-deal-pipeline`

`@repo/db` exports: `"."`, `"./enums"`, `"./schema"`, `"./queries"`, `"./mutations"`, `"./types"`, `"./workflow-jobs"`, `"./d1-context"`, `"./create-db"`

`@repo/db-tracker` exports (note: **no** `./types`): `"."`, `"./enums"`, `"./schema"`, `"./queries"`, `"./mutations"`, `"./workflow-jobs"`, `"./d1-context"`, `"./create-db"`

## Dev workflow

```sh
bun install
cp apps/frontend/.env.example apps/frontend/.env
bunx wrangler login
bash apps/frontend/scripts/setup-cloudflare.sh   # once per account
bun run --cwd apps/frontend dev
```

For project-trackers: `bun run --cwd apps/project-trackers dev` (port 3001). For telephony: `cd apps/telephony && npm install && npm run dev`.

To run workspace-wide tasks: `bun run dev`, `bun run build`, `bun run lint`.

## Telephony (`apps/telephony`)

- **Not** in bun workspaces. Uses npm + `ts-node` + `nodemon`.
- Env loading via `dotenv-flow` (auto-loads `.env.local`, `.env.development`, `.env`).
- Start: `npm run dev` (or `npm run start`). Outbound: `npm run outbound`.
- Has its own `tsconfig.json` (CommonJS, target es6). Does not share any workspace packages.
- `cd apps/telephony && npm install` before first run.

## Gotchas

- **No tests / no CI workflows** in repo (`.github/workflows/` is empty).
- **Two separate D1 databases** — frontend and project-trackers do NOT share a DB. Migrations must go to the correct database.
- **Frontend deploy skips migrations** — run `db:migrate:remote` manually before deploying frontend. Project-trackers deploy includes migrations.
- **Worker bundle size:** free tier 3 MiB gzip limit may block deploy.
- **`packageManager` / `.bun-version` are `bun@1.3.14`** — Cloudflare Builds reads this and installs the same Bun as local. Keep on latest stable via `bun upgrade`. Use text `bun.lock` only (`bun.lockb` is gitignored).
- **Telephony must be set up independently** (`cd apps/telephony && npm install`).
- **Dev always hits remote D1, Vectorize, and Workflows** — no local emulators. All dev shares the same bindings as production.
- **Frontend README is stale** (says Next.js + Prisma). Trust this file and `SETUP_LOCAL.md` instead.
- **Stale `.eslintrc.json`** in frontend — the real config is `eslint.config.mjs`.
- Seed scripts need a D1 binding (not available outside the Worker). Use the running app or `wrangler d1 execute` for ad-hoc SQL.
