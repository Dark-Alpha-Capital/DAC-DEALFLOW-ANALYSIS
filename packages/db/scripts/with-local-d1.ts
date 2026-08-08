import { spawnSync } from "node:child_process";
import { resolveLocalD1Path } from "./resolve-local-d1";

const drizzleArgs = process.argv.slice(2);

if (drizzleArgs.length === 0) {
  console.error("Usage: bun run scripts/with-local-d1.ts <drizzle-kit-args...>");
  process.exit(1);
}

const dbPath = resolveLocalD1Path();
if (!dbPath) {
  console.error(
    [
      "Local D1 database not found.",
      "",
      "First-time setup:",
      "  bun run db:migrate:local",
      "",
      "This creates a local SQLite database under apps/frontend/.wrangler/state/",
      "used by `vite dev` and Drizzle Studio.",
    ].join("\n"),
  );
  process.exit(1);
}

const result = spawnSync("drizzle-kit", drizzleArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    DRIZZLE_DB_URL: dbPath,
  },
});

process.exit(result.status ?? 1);
