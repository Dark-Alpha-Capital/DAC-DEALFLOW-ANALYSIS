import { createMiddleware } from "@tanstack/react-start";
import { runDbWithWorkerNeonPool } from "@repo/db";
import { isCloudflareWorkersRuntime } from "@repo/db/worker-neon-context";

/**
 * Neon Pool uses WebSockets; on Cloudflare Workers they must not outlive a single
 * request (see @neondatabase/serverless README). Bind one Pool + Drizzle per HTTP
 * request; `@repo/db` `db` reads from AsyncLocalStorage.
 */
export const neonPoolRequestMiddleware = createMiddleware().server(
  async ({ next }) => {
    if (!isCloudflareWorkersRuntime()) {
      return next();
    }
    return runDbWithWorkerNeonPool(async () => await next());
  },
);
