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
