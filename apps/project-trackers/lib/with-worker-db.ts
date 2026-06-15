import { env } from "cloudflare:workers";
import { runDbWithD1 } from "@repo/db-tracker";
import { isCloudflareWorkersRuntime } from "@repo/db-tracker/d1-context";

/**
 * On Cloudflare Workers, Drizzle `db` is backed by AsyncLocalStorage + D1.
 * Route handlers not reliably wrapped by TanStack Start middleware must use this.
 */
export async function withWorkerDbIfNeeded<T>(fn: () => Promise<T>): Promise<T> {
  if (!isCloudflareWorkersRuntime()) {
    return fn();
  }
  return runDbWithD1(env.DB, fn);
}
