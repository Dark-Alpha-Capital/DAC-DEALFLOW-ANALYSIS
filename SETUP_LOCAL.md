# Local Development Setup

Dev always uses **remote D1**, **Vectorize**, and **Workflows** on the Cloudflare account from `wrangler login` — the same bindings as production (`remote: true` in `wrangler.jsonc` + Vite `remoteBindings: true`).

There is no local database.

## Prerequisites

- **[Bun](https://bun.sh/)** 1.1.13+
- **Cloudflare account** (firm) + `wrangler login`
- API keys for auth, AI, Nextcloud, Bitrix as needed

## Quick start

```sh
git clone <repo-url>
cd bitrix-monorepo
bun install
bunx wrangler login

cp apps/frontend/.env.example apps/frontend/.env
# Edit: AUTH_SECRET, AUTH_GOOGLE_*, AI_API_KEY, BETTER_AUTH_URL=http://localhost:3000

# One-time per account (D1 migrations + Vectorize index)
bash apps/frontend/scripts/setup-cloudflare.sh

bun run --cwd apps/frontend dev
```

Open **http://localhost:3000** (remote D1 — same data as production `dealflow-db`).

Production: `https://dealflow.darkalphacapital.com` — see `apps/frontend/DEPLOY.md`.

## How it works

| Binding | Dev behavior |
|---|---|
| **D1** (`DB`) | Live `dealflow-db` on your CF account |
| **Vectorize** | Live `document-chunks` index |
| **Workflows** | Live workflow bindings on account |

`d1RequestMiddleware` binds `env.DB` per request; `@repo/db` `db` reads from AsyncLocalStorage.

## Migrations

```sh
bun run --cwd packages/db db:generate
bun run --cwd apps/frontend db:migrate:remote
```

## First admin user

Sign in with Google using an email in `apps/frontend/lib/utils.ts` → `adminEmails`.

## Troubleshooting

### D1 binding / `@repo/db` errors

- Run `wrangler login` on the firm account
- Confirm `account_id` and `d1_databases` in `wrangler.jsonc`
- Apply migrations: `wrangler d1 migrations apply dealflow-db --remote`

### OAuth redirect mismatch

Set `BETTER_AUTH_URL` and `VITE_PUBLIC_APP_URL` to `http://localhost:3000`.

### Seed scripts

CLI seed scripts need a D1 binding (not available outside the Worker). Prefer testing with the running app, or use `wrangler d1 execute dealflow-db --remote` for ad-hoc SQL.
