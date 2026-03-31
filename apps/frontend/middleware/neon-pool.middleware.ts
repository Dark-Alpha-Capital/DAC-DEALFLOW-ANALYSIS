import type { AnyFunctionMiddleware } from "@tanstack/start-client-core";
import { createMiddleware } from "@tanstack/react-start";
import { runDbWithWorkerNeonPool } from "@repo/db";
import { isCloudflareWorkersRuntime } from "@repo/db/worker-neon-context";

/**
 * Neon Pool uses WebSockets; on Cloudflare Workers they must not outlive a single
 * request (see @neondatabase/serverless README). Bind one Pool + Drizzle per scope;
 * `@repo/db` `db` reads from AsyncLocalStorage.
 */

/** Runs around the full Start HTTP request (SSR, HTML, server routes). */
export const neonPoolRequestMiddleware = createMiddleware().server(
  async ({ next }) => {
    if (!isCloudflareWorkersRuntime()) {
      return next();
    }
    return runDbWithWorkerNeonPool(async () => await next());
  },
);

/**
 * Separate instance for `functionMiddleware`: TanStack Start strips `requestMiddleware`
 * entries from the server-fn chain (dedupe), assuming the request ALS is still active.
 * On Workers, ALS can fail to cover `createServerFn` / Better Auth / Drizzle, so this
 * re-enters `runDbWithWorkerNeonPool` for each server function (nested pools are OK).
 */
export const neonPoolFunctionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  if (!isCloudflareWorkersRuntime()) {
    return next();
  }
  return runDbWithWorkerNeonPool(async () => await next());
}) as unknown as AnyFunctionMiddleware;
