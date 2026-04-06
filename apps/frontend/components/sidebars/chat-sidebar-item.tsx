
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { usePathname, useRouter } from "@/lib/navigation-shim";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { invalidateRecentChatsQuery } from "@/lib/chat-query-cache";

type Chat = { id: string; title: string };

export function ChatSidebarItem({ chat }: { chat: Chat }) {
  const pathname = usePathname();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);

  const updateMutation = useMutation(
    trpc.chats.updateTitle.mutationOptions({
      onSuccess: () => {
        void invalidateRecentChatsQuery(queryClient, trpc);
        setEditOpen(false);
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.chats.delete.mutationOptions({
      onSuccess: () => {
        void invalidateRecentChatsQuery(queryClient, trpc);
        setDeleteOpen(false);
        toast.success("Chat deleted successfully");
        if (pathname === `/chat/${chat.id}`) {
          router.push("/chat");
        }
      },
    }),
  );

  const handleEdit = () => {
    setEditTitle(chat.title);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    updateMutation.mutate({ chatId: chat.id, title: trimmed });
  };

  const handleDelete = () => {
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate({ chatId: chat.id });
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname === `/chat/${chat.id}`}>
          <Link to={`/chat/${chat.id}`}>
            <span className="truncate">{chat.title}</span>
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover aria-label="Chat options">
              <MoreVertical className="size-4" />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/chat/${chat.id}`}>
                <ExternalLink className="size-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="size-4" />
              Edit title
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit chat title</DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Chat title"
            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && deleteMutation.isPending) return;
          setDeleteOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and all its messages. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
