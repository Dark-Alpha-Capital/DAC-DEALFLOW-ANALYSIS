# Repository Guidelines

## Project Structure & Module Organization

- `apps/frontend/`: Next.js app (routes in `app/`, UI in `components/`, utilities in `lib/`).
- `apps/worker/`: Bun + Express worker (entrypoint `index.ts`, handlers in `handlers/`, shared helpers in `lib/`).
- `packages/db/`: shared database layer (Drizzle ORM; schema in `packages/db/schema.ts`, migrations in `packages/db/drizzle/`).
- `packages/ui/`: shared React component library (`packages/ui/src/`).
- `packages/types/`: shared TypeScript types.
- `packages/eslint-config/` and `packages/typescript-config/`: shared linting and TS configs.
- `.github/workflows/deploy-worker-server.yml`: deploys the worker to Google Cloud Run.
- `docker-compose.yml`: runs `frontend`, `worker`, and `redis` containers for local/prod-like usage.

## Build, Test, and Development Commands

From the repo root (Bun workspace + Turborepo):

- `bun install`: install dependencies.
- `bun run dev`: run all workspace `dev` tasks.
- `bun run build`: build all apps/packages.
- `bun run lint`: run ESLint across the repo via Turbo.
- `bun run check-types`: TypeScript typecheck across the repo via Turbo.
- `bun run format`: format `**/*.{ts,tsx,md}` with Prettier.

Run a single package with Turbo filters (examples):

- `bun run dev -- --filter=frontend` (frontend)
- `bun run dev -- --filter=worker` (worker)

Database utilities (Drizzle):

- `bun --cwd packages/db run db:push` / `db:migrate` / `db:generate` / `db:studio`

## Coding Style & Naming Conventions

- TypeScript-first; use 2-space indentation and keep modules small and focused.
- Format with Prettier; lint with ESLint (shared config in `packages/eslint-config/`).
- Naming: React components `PascalCase.tsx`, hooks `useThing.ts`, route handlers in `apps/frontend/app/**/route.ts`.

## Testing Guidelines

- No repo-wide `test` script is currently defined; rely on `bun run check-types` + `bun run lint` and manual smoke tests.
- If you add tests, colocate them (e.g., `*.test.ts`) and wire a `test` task into Turbo for the owning package.

## Commit & Pull Request Guidelines

- Commits follow an imperative, descriptive style, often with an area prefix (e.g., `Worker: improve Redis retry logic`).
- PRs should include: a clear summary, testing notes (commands run + results), screenshots for UI changes, and any required `.env`/schema updates.

## Security & Configuration Tips

- Never commit secrets (`.env`, service account keys). Prefer `*.env.example` for documentation.
- Required runtime env vars vary by app; start with `turbo.json` and each app’s `.env.example`.
