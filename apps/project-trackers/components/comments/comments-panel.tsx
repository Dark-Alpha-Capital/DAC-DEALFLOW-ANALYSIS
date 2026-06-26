import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { createWorkItemCommentSchema } from "@repo/schemas";
import { Loader2, Reply, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThreadedComment = {
  id: string;
  workItemId: string;
  userId: string | null;
  parentCommentId: string | null;
  content: string;
  createdAt: Date;
  replies: ThreadedComment[];
};

function formatRelativeTime(date: Date): string {
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  userId,
  depth = 0,
}: {
  comment: ThreadedComment;
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  userId: string | null;
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "ml-8 border-muted border-l-2 pl-4" : ""}>
      <div className="flex gap-3">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src="" />
          <AvatarFallback className="text-xs">?</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm font-medium">Team member</span>
            <span className="text-muted-foreground text-xs">{formatRelativeTime(comment.createdAt)}</span>
            {comment.userId === userId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6"><MoreHorizontal className="size-3" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDelete(comment.id)} className="text-destructive">
                    <Trash2 className="size-3 mr-2" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="text-foreground mt-1 text-sm whitespace-pre-wrap">{comment.content}</div>
          <Button variant="ghost" size="sm" className="text-muted-foreground mt-1 h-7 gap-1 text-xs" onClick={() => onReply(comment.id)}>
            <Reply className="size-3" />Reply
          </Button>
        </div>
      </div>
      {comment.replies.map((reply) => (
        <CommentItem key={reply.id} comment={reply} onReply={onReply} onDelete={onDelete} userId={userId} depth={depth + 1} />
      ))}
    </div>
  );
}

export function CommentsPanel({ workItemId }: { workItemId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const listQuery = trpc.workItemComments.listByWorkItem.queryOptions({ workItemId });
  const { data: comments = [], isLoading } = useQuery(listQuery);

  const form = useForm({
    resolver: zodResolver(createWorkItemCommentSchema),
    defaultValues: { workItemId, content: "", parentCommentId: null as string | null },
  });

  const invalidate = () => { void queryClient.invalidateQueries(listQuery); };

  const { mutate: create, isPending } = useMutation(
    trpc.workItemComments.create.mutationOptions({
      onSuccess: () => { toast.success("Comment added"); form.reset({ workItemId, content: "", parentCommentId: null }); setReplyingTo(null); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const { mutate: deleteComment } = useMutation(
    trpc.workItemComments.delete.mutationOptions({
      onSuccess: () => { toast.success("Comment deleted"); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const session = null;
  const userId = session ?? "current";

  function onSubmit(values: { workItemId: string; content: string; parentCommentId: string | null }) {
    create({
      workItemId: values.workItemId,
      content: values.content,
      parentCommentId: values.parentCommentId ?? null,
    });
  }

  function handleReply(parentId: string) {
    setReplyingTo(parentId);
    form.setValue("parentCommentId", parentId);
    form.setValue("content", "");
  }

  function handleTopLevel() {
    setReplyingTo(null);
    form.setValue("parentCommentId", null);
    form.setValue("content", "");
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField control={form.control} name="content" render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea rows={3} placeholder={replyingTo ? "Write a reply…" : "Write a comment…"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending || !form.watch("content").trim()}>
              {isPending ? "Posting…" : replyingTo ? "Reply" : "Comment"}
            </Button>
            {replyingTo && (
              <Button type="button" variant="ghost" size="sm" onClick={handleTopLevel}>Cancel reply</Button>
            )}
          </div>
        </form>
      </Form>
      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading…</div>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">No comments yet. Start the discussion.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} onReply={handleReply} onDelete={(id) => deleteComment({ commentId: id })} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
