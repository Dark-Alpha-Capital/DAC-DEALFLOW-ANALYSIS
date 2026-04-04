import { createFileRoute } from "@tanstack/react-router";
import { ChatRedirectSkeleton } from "@/components/skeletons/chat-redirect-skeleton";
import { ChatWelcome } from "@/components/chat/chat-welcome";

export const Route = createFileRoute("/_chatbot/chat/")({
  head: () => ({
    meta: [{ title: "Chat — Dark Alpha Capital" }],
  }),
  pendingComponent: ChatRedirectSkeleton,
  component: ChatWelcome,
});
