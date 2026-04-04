import { createFileRoute } from "@tanstack/react-router";
import { ChatClient } from "@/components/chat/chat-client";
import {
  fetchChatRouteLoaderData,
  type ChatRouteLoaderData,
} from "@/lib/fetch-chat-route-loader-data";
import ChatSessionPageSkeleton from "@/components/skeletons/chat-session-page-skeleton";

export const Route = createFileRoute("/_chatbot/chat/$id")({
  head: () => ({
    meta: [{ title: "Chat session — Dark Alpha Capital" }],
  }),
  loader: async ({ params }): Promise<ChatRouteLoaderData> =>
    fetchChatRouteLoaderData({
      data: { chatId: params.id },
    }),
  pendingComponent: ChatSessionPageSkeleton,
  component: ChatSessionRoute,
});

function ChatSessionRoute() {
  const { chatId, initialContext, initialMessages, initialSelection } =
    Route.useLoaderData();
  return (
    <ChatClient
      chatId={chatId}
      initialContext={initialContext}
      initialMessages={initialMessages}
      initialSelection={initialSelection}
    />
  );
}
