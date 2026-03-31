import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";

async function handleTrpc(req: Request): Promise<Response> {
  const [{ fetchRequestHandler }, { createTRPCContext }, { appRouter }] =
    await Promise.all([
      import("@trpc/server/adapters/fetch"),
      import("@/trpc/init"),
      import("@/trpc/routers/_app"),
    ]);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });
}

/**
 * Ensures a Neon pool + ALS for every tRPC request on Workers (including
 * `createTRPCContext` → Better Auth → `db`), independent of global middleware.
 */
export async function runTrpcHttpRequest(req: Request): Promise<Response> {
  return withWorkerDbIfNeeded(() => handleTrpc(req));
}
