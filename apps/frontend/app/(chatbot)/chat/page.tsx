import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { ChatRedirectSkeleton } from "@/components/skeletons/chat-redirect-skeleton";
import { ChatWelcome } from "@/components/chat/chat-welcome";

const ChatPage = () => {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<ChatRedirectSkeleton />}>
      <AuthedChatPage sessionPromise={sessionPromise} />
    </Suspense>
  );
};

async function AuthedChatPage(props: {
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const session = await props.sessionPromise;
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <ChatWelcome />;
}

export default ChatPage;
