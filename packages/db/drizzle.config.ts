import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for Cloudflare D1.
 *
 * - `DRIZZLE_DB_URL` (set by `scripts/with-local-d1.ts` for `db:push` /
 *   `db:studio`) points at the LOCAL D1 sqlite file in
 *   `apps/frontend/.wrangler/state/`, created by `db:migrate:local`. No driver
 *   is set so drizzle-kit auto-connects via `better-sqlite3` (devDep).
 * - Otherwise, if the Cloudflare env below is set, it targets remote D1 via the
 *   `d1-http` driver.
 * - Otherwise it falls back to `:memory:` (`db:generate` does not need a live DB).
 *
 * Remote env (see Cloudflare dashboard → D1 / API tokens):
 * - CLOUDFLARE_ACCOUNT_ID
 * - CLOUDFLARE_D1_DATABASE_ID (or CLOUDFLARE_DATABASE_ID)
 * - CLOUDFLARE_API_TOKEN (or CLOUDFLARE_D1_TOKEN) with D1 edit permission
 */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID ?? process.env.CLOUDFLARE_DATABASE_ID;
const token =
  process.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_D1_TOKEN;

const shared = {
  schema: "./schema.ts",
  out: "./drizzle",
  dialect: "sqlite" as const,
  verbose: true as const,
  strict: true as const,
};

export default process.env.DRIZZLE_DB_URL
  ? defineConfig({
      ...shared,
      dbCredentials: { url: process.env.DRIZZLE_DB_URL },
    })
  : accountId && databaseId && token
    ? defineConfig({
        ...shared,
        driver: "d1-http",
        dbCredentials: { accountId, databaseId, token },
      })
    : defineConfig({
        ...shared,
        dbCredentials: { url: ":memory:" },
      });
