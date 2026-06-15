import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { runDbWithD1 } from "@repo/db-tracker";
import { isCloudflareWorkersRuntime } from "@repo/db-tracker/d1-context";

export const d1RequestMiddleware = createMiddleware().server(async ({ next }) => {
  if (!isCloudflareWorkersRuntime()) return next();
  return runDbWithD1(env.DB, async () => await next());
});

export const d1FunctionMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    if (!isCloudflareWorkersRuntime()) return next();
    return runDbWithD1(env.DB, async () => await next());
  },
);
