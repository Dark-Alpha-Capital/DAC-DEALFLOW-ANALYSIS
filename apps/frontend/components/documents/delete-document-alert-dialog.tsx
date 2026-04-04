
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
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import type { DocumentRow } from "./columns";

interface DeleteDocumentAlertDialogProps {
  doc: DocumentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Restrict delete to a deal or company scope (server-enforced). */
  scopeEntityType?: "COMPANY" | "DEAL_OPPORTUNITY";
  scopeEntityId?: string;
}

export function DeleteDocumentAlertDialog({
  doc,
  open,
  onOpenChange,
  scopeEntityType,
  scopeEntityId,
}: DeleteDocumentAlertDialogProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const { mutate, isPending } = useMutation(
    trpc.files.deleteDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Document deleted");
        onOpenChange(false);
        void router.invalidate();
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to delete document");
      },
    })
  );

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    mutate({
      documentId: doc.id,
      ...(scopeEntityType && scopeEntityId
        ? { entityType: scopeEntityType, entityId: scopeEntityId }
        : {}),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove &quot;{doc.title ?? doc.fileName}&quot; from the
            database, Nextcloud storage, all ingested text chunks, and the vector
            search index. This cannot be undone.
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
