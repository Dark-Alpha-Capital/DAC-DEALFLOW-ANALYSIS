import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { runDbWithD1, workerD1DbAls } from "@repo/db-tracker";

/** Bind one D1-backed Drizzle instance per HTTP request; `@repo/db-tracker` `db` reads from ALS. */
export const d1RequestMiddleware = createMiddleware().server(async ({ next }) => {
  if (workerD1DbAls.getStore()?.db || !env?.DB) {
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
  if (workerD1DbAls.getStore()?.db || !env?.DB) {
    return next();
  }
  return runDbWithD1(env.DB, async () => await next());
});
