import { createFileRoute } from "@tanstack/react-router";
import { runTrpcHttpRequest } from "@/trpc/fetch-request-handler";

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: ({ request }) => runTrpcHttpRequest(request),
      POST: ({ request }) => runTrpcHttpRequest(request),
    },
  },
});
