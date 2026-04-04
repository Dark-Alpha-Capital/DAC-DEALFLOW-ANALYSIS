import { createFileRoute, redirect } from "@tanstack/react-router";
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
  loader: async ({ context, params }): Promise<ChatRouteLoaderData> => {
    const data = await fetchChatRouteLoaderData({
      data: { userId: context.authUserId, chatId: params.id },
    });
    if (!data) {
      throw redirect({ to: "/chat" });
    }

    return data as ChatRouteLoaderData;
  },
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
