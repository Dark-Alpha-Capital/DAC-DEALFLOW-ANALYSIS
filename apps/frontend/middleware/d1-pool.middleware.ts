import type { AnyFunctionMiddleware } from "@tanstack/start-client-core";
import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { runDbWithD1 } from "@repo/db";
import { isCloudflareWorkersRuntime } from "@repo/db/d1-context";

/** Bind one D1-backed Drizzle instance per HTTP request; `@repo/db` `db` reads from ALS. */
export const d1RequestMiddleware = createMiddleware().server(async ({ next }) => {
  if (!isCloudflareWorkersRuntime()) {
    return next();
  }
  return runDbWithD1(env.DB, async () => await next());
});

/**
 * TanStack Start strips `requestMiddleware` from the server-fn chain; re-enter D1 ALS
 * for each server function (nested scopes are OK).
 */
export const d1FunctionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  if (!isCloudflareWorkersRuntime()) {
    return next();
  }
  return runDbWithD1(env.DB, async () => await next());
}) as unknown as AnyFunctionMiddleware;
