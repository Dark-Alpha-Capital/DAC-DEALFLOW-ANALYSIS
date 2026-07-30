import type { AnyFunctionMiddleware } from "@tanstack/start-client-core";
import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { isCloudflareWorkersRuntime, withDb } from "@repo/db";

/** Per request: `const db = drizzle(env.DB)` via `withDb`. */
export const d1RequestMiddleware = createMiddleware().server(async ({ next }) => {
  if (!isCloudflareWorkersRuntime()) {
    return next();
  }
  return withDb(env.DB, async () => await next());
});

/**
 * TanStack Start strips `requestMiddleware` from the server-fn chain; re-enter D1
 * for each server function (nested scopes are OK).
 */
export const d1FunctionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  if (!isCloudflareWorkersRuntime()) {
    return next();
  }
  return withDb(env.DB, async () => await next());
}) as unknown as AnyFunctionMiddleware;
