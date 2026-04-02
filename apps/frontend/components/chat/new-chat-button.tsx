
import { useRouter } from "@/lib/navigation-shim";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

type NewChatButtonProps = {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
};

export function NewChatButton({
  variant = "default",
  size = "default",
  className,
  children,
}: NewChatButtonProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.chats.create.mutationOptions({
      onSuccess: (id) => {
        queryClient.invalidateQueries({
          queryKey: trpc.chats.listRecent.queryKey({ limit: 50 }),
        });
        router.push(`/chat/${id}`);
      },
    }),
  );

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => createMutation.mutate()}
      disabled={createMutation.isPending}
    >
      {createMutation.isPending ? (
        <span className="animate-pulse">Creating...</span>
      ) : (
        children ?? (
          <>
            <MessageSquarePlus className="size-4" />
            <span>New Chat</span>
          </>
        )
      )}
    </Button>
  );
}
