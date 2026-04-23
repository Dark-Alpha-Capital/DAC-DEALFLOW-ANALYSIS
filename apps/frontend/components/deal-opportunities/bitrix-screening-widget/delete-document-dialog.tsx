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
import type { DealDocumentRow } from "./types";

export function DeleteDocumentDialog({
  doc,
  deleting,
  onCancel,
  onConfirm,
}: {
  doc: DealDocumentRow | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: (doc: DealDocumentRow) => void;
}) {
  return (
    <AlertDialog
      open={doc != null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this file from the deal?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-muted-foreground space-y-2 text-sm">
              <p>
                This permanently removes{" "}
                <span className="text-foreground font-medium">
                  {doc?.fileName ?? "this file"}
                </span>{" "}
                for this deal: stored file, database record, all ingested text
                chunks, and matching vectors in the vector search index.
                Related records that reference this document may also be
                removed by the database. This cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting || !doc}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              if (!doc) return;
              onConfirm(doc);
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
