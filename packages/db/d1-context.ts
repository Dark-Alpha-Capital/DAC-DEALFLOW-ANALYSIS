import { AsyncLocalStorage } from "node:async_hooks";
import type { AppDb } from "./db-types";

/** Request-scoped Drizzle client set by `withDb(env.DB, ...)`. */
export const dbAls = new AsyncLocalStorage<AppDb>();

/** @deprecated Prefer `dbAls`; kept for older `{ db }` store shape. */
export const workerD1DbAls = {
  getStore(): { db: AppDb } | undefined {
    const db = dbAls.getStore();
    return db ? { db } : undefined;
  },
  run<T>(store: { db: AppDb }, fn: () => T): T {
    return dbAls.run(store.db, fn);
  },
};

export function isCloudflareWorkersRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "Cloudflare" in globalThis &&
    (globalThis as { Cloudflare?: { compatibilityFlags?: unknown } })
      .Cloudflare?.compatibilityFlags !== undefined
  );
}
