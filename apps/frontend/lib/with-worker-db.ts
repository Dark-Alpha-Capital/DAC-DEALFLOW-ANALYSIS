import { env } from "cloudflare:workers";
import { isCloudflareWorkersRuntime, withDb } from "@repo/db";

/**
 * On Cloudflare Workers, bind `drizzle(env.DB)` for the request
 * so `import { db } from "@repo/db"` works inside `fn`.
 */
export async function withWorkerDbIfNeeded<T>(fn: () => Promise<T>): Promise<T> {
  if (!isCloudflareWorkersRuntime()) {
    return fn();
  }
  return withDb(env.DB, fn);
}
