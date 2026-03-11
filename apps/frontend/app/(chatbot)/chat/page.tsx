import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { createChatSessionForUser } from "@/lib/chat-store";
import { Skeleton } from "@/components/ui/skeleton";

function ChatRedirectSkeleton() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

const ChatPage = () => {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<ChatRedirectSkeleton />}>
      <AuthedChatRedirect sessionPromise={sessionPromise} />
    </Suspense>
  );
};

async function AuthedChatRedirect(props: {
  sessionPromise: ReturnType<typeof getSession>;
}): Promise<never> {
  const session = await props.sessionPromise;
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const id = await createChatSessionForUser(session.user.id);
  redirect(`/chat/${id}`);
}

export default ChatPage;
