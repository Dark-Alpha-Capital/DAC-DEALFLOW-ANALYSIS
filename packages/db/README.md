# @repo/db

Drizzle ORM for **Cloudflare D1**. The running app always uses `env.DB` (remote D1 in dev and prod).

## Schema changes

```bash
bun run db:generate
cd ../../apps/frontend && wrangler d1 migrations apply dealflow-db --remote
```

For `drizzle-kit push` / studio against remote D1, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and `CLOUDFLARE_API_TOKEN` in env.

## Seeds

Seed scripts import `db` and only work with a D1 binding (Worker runtime). For ad-hoc data, use the app UI or `wrangler d1 execute dealflow-db --remote`.
