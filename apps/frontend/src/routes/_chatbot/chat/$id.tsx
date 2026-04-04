import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChatClient } from "@/components/chat/chat-client";
import {
  fetchChatRouteLoaderData,
  type ChatRouteLoaderData,
} from "@/lib/fetch-chat-route-loader-data";
import { Skeleton } from "@/components/ui/skeleton";

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
  pendingComponent: ChatSessionSkeleton,
  component: ChatSessionRoute,
});

function ChatSessionSkeleton() {
  return (
    <div className="flex min-h-[60vh] flex-col gap-6">
      <div className="space-y-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-16 w-1/2" />
      </div>
      <div className="mt-auto">
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

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
