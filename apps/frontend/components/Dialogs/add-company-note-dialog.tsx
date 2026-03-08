"use client";

import * as React from "react";
import type { CompanyNote } from "@repo/db/schema";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditor";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AddCompanyNoteDialogProps {
  companyId: string;
  note?: CompanyNote;
  onSaved?: () => void;
  triggerLabel?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default";
  /** When provided, revalidates deal cache after mutation */
  dealUid?: string;
}

export function AddCompanyNoteDialog({
  companyId,
  note,
  onSaved,
  triggerLabel = note ? "Edit note" : "Add note",
  variant = "default",
  size = "sm",
  dealUid,
}: AddCompanyNoteDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(note?.title ?? "");
  const [content, setContent] = React.useState(note?.content ?? "");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const trpc = useTRPC();

  const { mutate: createNote, isPending: isCreating } = useMutation(
    trpc.companyNotes.create.mutationOptions({
      onSuccess: () => {
        toast.success("Note added");
        setOpen(false);
        onSaved?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save note");
      },
    }),
  );

  const { mutate: updateNote, isPending: isUpdating } = useMutation(
    trpc.companyNotes.update.mutationOptions({
      onSuccess: () => {
        toast.success("Note updated");
        setOpen(false);
        onSaved?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save note");
      },
    }),
  );

  const isPending = isCreating || isUpdating;

  const resetState = React.useCallback(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
  }, [note]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    setOpen(nextOpen);
  };

  const handleSave = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error("Note content is required");
      return;
    }

    if (note) {
      updateNote({
        id: note.id,
        title: title.trim() || undefined,
        content: trimmedContent,
        dealUid,
      });
    } else {
      createNote({
        companyId,
        title: title.trim() || undefined,
        content: trimmedContent,
        dealUid,
      });
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant={variant} size={size}>
            {triggerLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-5xl lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{note ? "Edit Note" : "Add Note"}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex max-h-[calc(80vh-5rem)] flex-col space-y-3">
            <Input
              placeholder="Optional title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <ResizablePanelGroup
              direction="horizontal"
              className="mt-2 max-h-[60vh] min-h-[320px]"
            >
              <ResizablePanel defaultSize={55} minSize={30}>
                <div className="flex h-full flex-col gap-2 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Editor
                    </span>
                  </div>
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Write your note in Markdown..."
                    rows={12}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={45} minSize={30}>
                <div className="flex h-full flex-col gap-2 pl-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">
                      Preview
                    </span>
                  </div>
                  <div className="prose dark:prose-invert bg-muted/30 max-h-[320px] w-full max-w-none overflow-y-auto rounded-md border p-3 text-sm">
                    {content.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Nothing to preview yet.
                      </p>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "Saving..." : note ? "Save changes" : "Add note"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button variant={variant} size={size}>
          {triggerLabel}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{note ? "Edit Note" : "Add Note"}</DrawerTitle>
        </DrawerHeader>
        <div className="flex max-h-[calc(90vh-7rem)] flex-col gap-3 overflow-y-auto px-4 pt-0 pb-4">
          <Input
            placeholder="Optional title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Editor
              </p>
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="Write your note in Markdown..."
                rows={10}
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Preview
              </p>
              <div className="prose dark:prose-invert bg-muted/30 max-h-[220px] w-full max-w-none overflow-y-auto rounded-md border p-3 text-sm">
                {content.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Nothing to preview yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <DrawerFooter className="pt-0">
          <div className="flex justify-end gap-2">
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
              >
                Cancel
              </Button>
            </DrawerClose>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? "Saving..." : note ? "Save changes" : "Add note"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
