import { defineConfig } from "drizzle-kit";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
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
        url: ":memory:",
      },
  verbose: true,
  strict: true,
});
