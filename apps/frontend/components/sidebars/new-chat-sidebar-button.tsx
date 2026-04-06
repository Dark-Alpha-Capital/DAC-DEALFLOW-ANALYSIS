
import { useRouter } from "@/lib/navigation-shim";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useTRPC } from "@/trpc/client";
import { invalidateRecentChatsQuery } from "@/lib/chat-query-cache";

export function NewChatSidebarButton({ isActive }: { isActive: boolean }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.chats.create.mutationOptions({
      onSuccess: (id) => {
        void invalidateRecentChatsQuery(queryClient, trpc);
        router.push(`/chat/${id}`);
      },
    }),
  );

  return (
    <SidebarMenuButton
      isActive={isActive}
      onClick={() => createMutation.mutate()}
      disabled={createMutation.isPending}
    >
      <MessageSquarePlus className="size-4" />
      <span>{createMutation.isPending ? "Creating..." : "New Chat"}</span>
    </SidebarMenuButton>
  );
}
