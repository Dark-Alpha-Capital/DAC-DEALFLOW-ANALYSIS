export async function runTrpcHttpRequest(req: Request): Promise<Response> {
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
