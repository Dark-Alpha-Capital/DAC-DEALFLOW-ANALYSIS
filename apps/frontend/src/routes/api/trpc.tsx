import { createFileRoute } from "@tanstack/react-router";

async function trpcHandler(req: Request) {
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

export const Route = createFileRoute("/api/trpc")({
  server: {
    handlers: {
      GET: ({ request }) => trpcHandler(request),
      POST: ({ request }) => trpcHandler(request),
    },
  },
});
