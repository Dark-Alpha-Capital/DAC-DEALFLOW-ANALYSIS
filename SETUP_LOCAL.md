# Local Development Setup

Dev uses a **local D1** database (`.wrangler/state`), while **Vectorize** stays on the live account (there is no local emulator). **Workflows** run locally via Miniflare. Production is unaffected — only `vite dev` bindings change.

## Prerequisites

- **[Bun](https://bun.sh/)** 1.3.14 (match `packageManager` / `.bun-version`; run `bun upgrade` if behind)
- **Cloudflare account** (firm) + `wrangler login` (still needed for remote Vectorize and `wrangler d1` remote ops)
- API keys for auth, AI, Nextcloud, Bitrix as needed

## Quick start

```sh
git clone <repo-url>
cd bitrix-monorepo
bun install
bunx wrangler login

cp apps/frontend/.env.example apps/frontend/.env
# Edit: AUTH_SECRET, AUTH_GOOGLE_*, AI_API_KEY, BETTER_AUTH_URL=http://localhost:3000

# One-time per account (Vectorize index only)
bash apps/frontend/scripts/setup-cloudflare.sh

# Apply migrations to the LOCAL database (first time / after db:generate)
bun run --cwd packages/db db:migrate:local

bun run --cwd apps/frontend dev
```

Open **http://localhost:3000** (local D1 — persisted in `.wrangler/state/v3/d1`).

Production: `https://dealflow.darkalphacapital.com` — see `apps/frontend/DEPLOY.md`.

## How it works

| Binding | Dev behavior |
|---|---|
| **D1** (`DB`) | Local D1, persisted in `.wrangler/state` (no `"remote": true` in `wrangler.jsonc`) |
| **Vectorize** | Live `document-chunks` index (kept `remote: true` — no local emulator) |
| **Workflows** | Local Miniflare workflow emulation |

`d1RequestMiddleware` binds `env.DB` per request; `@repo/db` `db` reads from AsyncLocalStorage.

## Migrations

```sh
bun run --cwd packages/db db:generate
bun run --cwd packages/db db:migrate:local     # local dev DB
bun run --cwd packages/db db:migrate:remote    # production / remote DB
```

## Drizzle Studio (local DB)

```sh
bun run --cwd packages/db db:studio
```

Drizzle Studio opens against the **local** D1 (it resolves the sqlite file under
`apps/frontend/.wrangler/state/`, same one `vite dev` uses). Requires
`db:migrate:local` to have been run at least once. `db:push` works the same way
against the local DB.

## First admin user

Sign in with Google using an email in `apps/frontend/lib/utils.ts` → `adminEmails`.

## Troubleshooting

### Empty / missing tables locally

Apply migrations to the local DB: `bun run --cwd packages/db db:migrate:local`.

### D1 binding / `@repo/db` errors

- Run `wrangler login` on the firm account
- Confirm `account_id` and `d1_databases` in `wrangler.jsonc`
- Local: `wrangler d1 migrations apply dealflow-db --local`
- Remote: `wrangler d1 migrations apply dealflow-db --remote`

### OAuth redirect mismatch

Set `BETTER_AUTH_URL` and `VITE_PUBLIC_APP_URL` to `http://localhost:3000`.

### Seed scripts

CLI seed scripts need a D1 binding (not available outside the Worker). Prefer testing with the running app, or use `wrangler d1 execute dealflow-db --local` for ad-hoc SQL.
