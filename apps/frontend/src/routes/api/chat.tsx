import { createFileRoute } from "@tanstack/react-router";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { postChat } = await import("@/lib/chat-post.server");
        return withWorkerDbIfNeeded(() => postChat(request));
      },
    },
  },
});
