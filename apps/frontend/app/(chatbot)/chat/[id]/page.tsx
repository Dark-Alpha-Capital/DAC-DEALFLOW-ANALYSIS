import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChatClient } from "@/components/chat/chat-client";
import { getSession } from "@/lib/auth-server";
import { type ChatContext } from "@/lib/chat-context";
import { coerceStoredMessages, getChatSessionForUser } from "@/lib/chat-store";
import { getSelectionFromProviderAndModel } from "@/lib/chat-models";
import { Skeleton } from "@/components/ui/skeleton";

type Params = Promise<{ id: string }>;

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

const ChatSessionPage = (props: { params: Params }) => {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<ChatSessionSkeleton />}>
      <AuthedChatSession
        params={props.params}
        sessionPromise={sessionPromise}
      />
    </Suspense>
  );
};

async function AuthedChatSession(props: {
  params: Params;
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const [session, params] = await Promise.all([
    props.sessionPromise,
    props.params,
  ]);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const chat = await getChatSessionForUser(session.user.id, params.id);
  if (!chat) {
    redirect("/chat");
  }

  const initialMessages = coerceStoredMessages(chat.messages);
  const initialSelection = getSelectionFromProviderAndModel(
    chat.provider,
    chat.model,
  );
  const initialContext: ChatContext = {
    companyId: chat.companyId,
    leadId: chat.leadId,
    dealOpportunityId: chat.dealOpportunityId,
  };

  return (
    <ChatClient
      chatId={chat.id}
      initialContext={initialContext}
      initialMessages={initialMessages}
      initialSelection={initialSelection}
    />
  );
}

export default ChatSessionPage;
