import { createDb } from "./create-db";
import { dbAls, isCloudflareWorkersRuntime } from "./d1-context";
import type { AppDb } from "./db-types";

export type { AppDb } from "./db-types";
export * from "./enums";
export * from "./schema";

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
  between,
  notInArray,
} from "drizzle-orm";
export { ilike, jsonArrayOverlaps } from "./sqlite-helpers";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export { createDb, createDbFromD1 } from "./create-db";
export { dbAls, isCloudflareWorkersRuntime, workerD1DbAls } from "./d1-context";

/**
 * Run `fn` with Drizzle bound to a D1 database.
 * Prefer this at Workers / workflow boundaries: `withDb(env.DB, ...)`.
 */
export async function withDb<T>(
  d1: D1Database,
  fn: () => Promise<T>,
): Promise<T> {
  return dbAls.run(createDb(d1), fn);
}

/** @deprecated Prefer `withDb` */
export const runDbWithD1 = withDb;

function requireDb(): AppDb {
  const instance = dbAls.getStore();
  if (!instance) {
    throw new Error(
      isCloudflareWorkersRuntime()
        ? "@repo/db: no D1 binding in scope. Wrap the request with withDb(env.DB, ...) (middleware / workflows)."
        : "@repo/db: no local database. Use `bun run --cwd apps/frontend dev` (remote D1). For scripts, use withDb(d1, ...) or `wrangler d1`.",
    );
  }
  return instance;
}

/**
 * Request-scoped Drizzle client. Only valid inside `withDb(env.DB, ...)`.
 * Equivalent to the guide's `const db = drizzle(env.DB)` once D1 is in scope.
 */
export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    return Reflect.get(requireDb() as object, prop, receiver);
  },
});

export default db;
