import { runDbWithWorkerNeonPool } from "@repo/db";
import { isCloudflareWorkersRuntime } from "@repo/db/worker-neon-context";

/**
 * On Cloudflare Workers, Drizzle `db` is backed by AsyncLocalStorage + a
 * per-request Neon pool. Route handlers that are not (reliably) wrapped by
 * TanStack Start `requestMiddleware` must call `db` inside this helper.
 */
export async function withWorkerDbIfNeeded<T>(fn: () => Promise<T>): Promise<T> {
  if (!isCloudflareWorkersRuntime()) {
    return fn();
  }
  return runDbWithWorkerNeonPool(fn);
}
