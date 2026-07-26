import { env } from "cloudflare:workers";
import { runDbWithD1, workerD1DbAls } from "@repo/db-tracker";

/**
 * Prefer request-scoped D1 from `src/server.ts`. This is a fallback for paths
 * that may run outside that wrapper (rare).
 */
export async function withWorkerDbIfNeeded<T>(fn: () => Promise<T>): Promise<T> {
  if (workerD1DbAls.getStore()?.db) {
    return fn();
  }
  if (!env?.DB) {
    console.error("[db] withWorkerDbIfNeeded: env.DB missing and no ALS store");
    return fn();
  }
  return runDbWithD1(env.DB, fn);
}
