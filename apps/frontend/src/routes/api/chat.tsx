import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { postChat } = await import("@/lib/chat-post.server");
        return postChat(request);
      },
    },
  },
});
