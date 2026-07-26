import { createServerFn } from "@tanstack/react-start";
import { d1FunctionMiddleware } from "@/middleware/d1-pool.middleware";

type ServerFnMethod = "GET" | "POST";

/**
 * Drop-in `createServerFn` that binds D1 ALS for the handler lifetime.
 * Prefer this over wrapping handler bodies with `withWorkerDbIfNeeded`.
 *
 * Global `functionMiddleware` in `src/start.ts` also binds D1; this makes the
 * dependency explicit per server fn (and survives if global options fail to load).
 */
export function createDbServerFn<TMethod extends ServerFnMethod = "GET">(options?: {
  method?: TMethod;
}) {
  return createServerFn({ method: options?.method ?? "GET" }).middleware([
    d1FunctionMiddleware,
  ]);
}
