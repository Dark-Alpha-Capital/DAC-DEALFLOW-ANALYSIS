import { createDbFromD1 } from "./create-db";
import { isCloudflareWorkersRuntime, workerD1DbAls } from "./d1-context";

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

export { createDbFromD1 } from "./create-db";
export { isCloudflareWorkersRuntime, workerD1DbAls } from "./d1-context";

import type { AppDb } from "./db-types";

const workerDbProxy: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const store = workerD1DbAls.getStore();
    if (!store?.db) {
      throw new Error(
        "@repo/db: Drizzle `db` was used without an active D1 binding. Run the app with `bun run dev` (remote D1 via Wrangler), or call `runDbWithD1(env.DB, ...)`.",
      );
    }
    return Reflect.get(store.db as object, prop, receiver);
  },
});

const nodeDbProxy: AppDb = new Proxy({} as AppDb, {
  get() {
    throw new Error(
      "@repo/db: No local database. Use `bun run dev` in apps/frontend — dev uses remote D1 on your Cloudflare account (see wrangler.jsonc `d1_databases` with `remote: true`). For CLI scripts, use `runDbWithD1` with a D1 binding or `wrangler d1` commands.",
    );
  },
});

export const db: AppDb = isCloudflareWorkersRuntime()
  ? workerDbProxy
  : nodeDbProxy;

/**
 * Run `fn` with a D1-backed Drizzle instance (Workers + Workflows).
 */
export async function runDbWithD1<T>(
  d1: D1Database,
  fn: () => Promise<T>,
): Promise<T> {
  const requestDb = createDbFromD1(d1);
  return workerD1DbAls.run({ db: requestDb }, fn);
}

export default db;
