import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import {
  ensureNeonConfiguredForCloudflareWorkers,
  isCloudflareWorkersRuntime,
  isNeonHost,
  workerNeonDbAls,
} from "./worker-neon-context";

// Re-export enums first (no drizzle/postgres) for shared types/constants
export * from "./enums";
// Re-export everything from schema
export * from "./schema";

// Re-export drizzle operators
export {
  eq,
  and,
  or,
  sql,
  asc,
  desc,
  inArray,
  count,
  gte,
  lte,
  isNull,
  isNotNull,
  ne,
  gt,
  lt,
  like,
  ilike,
  between,
  notInArray,
} from "drizzle-orm";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

/** Both drivers are ORM-compatible; use PostgresJs shape for overload resolution (e.g. `.returning({ col })`). */
export type AppDb = PostgresJsDatabase<typeof schema>;

function requireDatabaseUrl(): string {
  const u = process.env.DATABASE_URL;
  if (!u) {
    console.error("ERROR: DATABASE_URL environment variable is not set!");
    throw new Error("DATABASE_URL is required");
  }
  return u;
}

const url = requireDatabaseUrl();

if (isCloudflareWorkersRuntime()) {
  ensureNeonConfiguredForCloudflareWorkers();
  if (!isNeonHost(url)) {
    throw new Error(
      "@repo/db: Cloudflare Workers need a Neon DATABASE_URL (host containing neon.tech). TCP postgres cannot be reused per request; use Neon + per-request Pool (see request middleware) or Hyperdrive.",
    );
  }
}

const nodeDb: AppDb | null = isCloudflareWorkersRuntime()
  ? null
  : drizzlePostgres(
    postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => { },
      debug: process.env.NODE_ENV === "development" ? console.log : undefined,
    }),
    { schema },
  );

const workerDbProxy: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const store = workerNeonDbAls.getStore();
    if (!store?.db) {
      throw new Error(
        "@repo/db: Drizzle `db` was used on Cloudflare Workers without an active Neon pool. Ensure `neonPoolRequestMiddleware` is registered in TanStack Start `requestMiddleware`.",
      );
    }
    return Reflect.get(store.db as object, prop, receiver);
  },
});

export const db: AppDb = isCloudflareWorkersRuntime()
  ? workerDbProxy
  : (nodeDb as AppDb);

/**
 * Run `fn` with a Neon Pool bound for this call (Workers only). Used by HTTP
 * middleware and Cloudflare Workflows — Pool/WebSockets must not cross requests.
 */
export async function runDbWithWorkerNeonPool<T>(fn: () => Promise<T>): Promise<T> {
  if (!isCloudflareWorkersRuntime()) {
    return fn();
  }
  ensureNeonConfiguredForCloudflareWorkers();
  const pool = new Pool({ connectionString: url });
  const requestDb = drizzleNeon(pool, { schema }) as unknown as AppDb;
  return workerNeonDbAls.run({ pool, db: requestDb }, async () => {
    try {
      return await fn();
    } finally {
      await pool.end().catch(() => undefined);
    }
  });
}

// Default export for convenience
export default db;
