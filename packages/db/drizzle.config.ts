import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for Cloudflare D1 (HTTP driver).
 *
 * Env (see Cloudflare dashboard → D1 / API tokens):
 * - CLOUDFLARE_ACCOUNT_ID
 * - CLOUDFLARE_D1_DATABASE_ID (or CLOUDFLARE_DATABASE_ID)
 * - CLOUDFLARE_API_TOKEN (or CLOUDFLARE_D1_TOKEN) with D1 edit permission
 */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID ?? process.env.CLOUDFLARE_DATABASE_ID;
const token =
  process.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_D1_TOKEN;
const useRemoteD1 = Boolean(accountId && databaseId && token);

export default defineConfig({
  schema: "./schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: useRemoteD1 ? "d1-http" : undefined,
  dbCredentials: useRemoteD1
    ? {
        accountId: accountId!,
        databaseId: databaseId!,
        token: token!,
      }
    : {
        // `generate` does not need a live DB; `push` / `studio` need the env above
        url: ":memory:",
      },
  verbose: true,
  strict: true,
});
