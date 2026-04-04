import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import DeleteEntityDialog from "@/components/DeleteEntityDialog";

export function DealActionsCell({
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
        router.push("/deal-opportunities");
        void router.invalidate();
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete deal opportunity");
      },
    }),
  );

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <Link
              to={`/deal-opportunities/${dealOpportunityId}`}
              className="flex items-center"
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to={`/deal-opportunities/${dealOpportunityId}/edit`}
              className="flex items-center"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive flex items-center"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteEntityDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete deal opportunity?"
        description="This will permanently delete this deal opportunity. This action cannot be undone."
        onConfirm={() => deleteOpportunity({ id: dealOpportunityId })}
        isPending={isDeleting}
      />
    </div>
  );
}
