import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CloudUpload, Eye, Pencil, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import DeleteEntityDialog from "@/components/DeleteEntityDialog";

/** Stops @dnd-kit drag from starting when interacting with actions. */
export function stopDragPointer(
  e: Pick<React.PointerEvent, "stopPropagation">,
) {
  e.stopPropagation();
}

export function KanbanDealOpportunityActions({
  dealOpportunityId,
}: {
  dealOpportunityId: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: deleteOpportunity, isPending: isDeleting } = useMutation(
    trpc.dealOpportunities.deleteOpportunity.mutationOptions({
      onSuccess: () => {
        toast.success("Deal opportunity deleted");
        void router.invalidate();
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete deal opportunity");
      },
    }),
  );

  const iconBtn =
    "text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 cursor-pointer rounded-md transition-colors duration-200 hover:bg-muted/90 dark:hover:bg-zinc-800/90 motion-reduce:transition-none";

  return (
    <>
      <div
        className="mt-1.5 flex flex-wrap items-center justify-end gap-0.5"
        onPointerDown={stopDragPointer}
      >
        <Button variant="ghost" size="icon" className={iconBtn} asChild>
          <Link
            to="/deal-opportunities/$uid"
            params={{ uid: dealOpportunityId }}
            aria-label="View deal"
          >
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className={iconBtn} asChild>
          <Link
            to="/deal-opportunities/$uid/edit"
            params={{ uid: dealOpportunityId }}
            aria-label="Edit deal"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className={iconBtn} asChild>
          <Link
            to="/deal-opportunities/$uid/sync-bitrix-24"
            params={{ uid: dealOpportunityId }}
            aria-label="Sync to Bitrix24"
          >
            <CloudUpload className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${iconBtn} text-muted-foreground hover:bg-destructive/15 hover:text-destructive`}
          aria-label="Delete deal"
          disabled={isDeleting}
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <DeleteEntityDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete deal opportunity?"
        description="This will permanently delete this deal opportunity. This action cannot be undone."
        onConfirm={() => deleteOpportunity({ id: dealOpportunityId })}
        isPending={isDeleting}
      />
    </>
  );
}
