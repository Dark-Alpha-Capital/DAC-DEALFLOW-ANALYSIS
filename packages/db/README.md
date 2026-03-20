# db

To install dependencies:

```bash
bun install
```

## Schema changes

**Use migrations** (recommended for production):

1. Edit `schema.ts`
2. `bun run db:generate` – creates migration in `drizzle/`
3. `bun run db:migrate` – applies pending migrations to DB

**Important:** The worker loads `apps/worker/.env` and `.env.local`. Run migrations with the same `DATABASE_URL` (e.g. `cd packages/db && bun run db:migrate` after sourcing worker env, or run from a shell that has it).

**Or use push** (dev only, no migration files):

- `bun run db:push` – syncs schema directly to DB (can hang on large DBs)

Migrations are the source of truth. Run `db:migrate` after pulling schema changes.

## Seed dummy data

To insert 100 fake InvestorLeads and 100 fake Leads:

```bash
cd packages/db && bun run db:seed:dummy-leads
```

Ensure `DATABASE_URL` is set (e.g. `bun run --env-file=../../apps/frontend/.env db:seed:dummy-leads`). Re-running appends another 200 rows unless you truncate manually.
