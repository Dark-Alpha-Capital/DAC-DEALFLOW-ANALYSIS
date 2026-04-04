import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout: child routes (`/chat/`, `/chat/$id`) render in the outlet. */
export const Route = createFileRoute("/_chatbot/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  return <Outlet />;
}
