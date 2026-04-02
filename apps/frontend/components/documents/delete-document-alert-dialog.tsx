
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import type { DocumentRow } from "./columns";

interface DeleteDocumentAlertDialogProps {
  doc: DocumentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDocumentAlertDialog({
  doc,
  open,
  onOpenChange,
}: DeleteDocumentAlertDialogProps) {
  const trpc = useTRPC();
  const { mutate, isPending } = useMutation(
    trpc.files.deleteDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Document deleted");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to delete document");
      },
    })
  );

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    mutate({ documentId: doc.id });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{doc.title ?? doc.fileName}&quot; from the
            database and from storage. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
