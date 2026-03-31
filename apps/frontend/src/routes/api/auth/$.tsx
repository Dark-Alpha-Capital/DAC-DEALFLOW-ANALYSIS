import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/auth";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => withWorkerDbIfNeeded(() => auth.handler(request)),
      POST: ({ request }) => withWorkerDbIfNeeded(() => auth.handler(request)),
    },
  },
});
