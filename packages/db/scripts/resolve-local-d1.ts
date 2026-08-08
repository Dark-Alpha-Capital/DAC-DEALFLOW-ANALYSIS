import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Database } from "bun:sqlite";

const WRANGLER_D1_DIR = resolve(
  import.meta.dir,
  "../../../apps/frontend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);

const FALLBACK_DB = resolve(import.meta.dir, "../.local/dealflow-db.sqlite");

function hasUserTable(dbPath: string): boolean {
  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User' LIMIT 1",
      )
      .get();
    return row != null;
  } finally {
    db.close();
  }
}

/** Resolve the local Wrangler D1 SQLite file used during `vite dev` / `db:migrate:local`. */
export function resolveLocalD1Path(): string | null {
  if (process.env.DRIZZLE_DB_URL) {
    return process.env.DRIZZLE_DB_URL;
  }

  if (!existsSync(WRANGLER_D1_DIR)) {
    return existsSync(FALLBACK_DB) ? FALLBACK_DB : null;
  }

  const candidates = readdirSync(WRANGLER_D1_DIR)
    .filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
    .map((file) => join(WRANGLER_D1_DIR, file))
    .filter((filePath) => {
      try {
        return hasUserTable(filePath);
      } catch {
        return false;
      }
    })
    .toSorted((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (candidates[0]) {
    return candidates[0];
  }

  return existsSync(FALLBACK_DB) ? FALLBACK_DB : null;
}

if (import.meta.main) {
  const path = resolveLocalD1Path();
  if (!path) {
    console.error("Local D1 database not found. Run: bun run db:migrate:local");
    process.exit(1);
  }
  console.log(path);
}
