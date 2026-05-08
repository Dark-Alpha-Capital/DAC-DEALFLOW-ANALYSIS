
import { useState } from "react";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import type { Lead } from "@repo/db";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import DeleteEntityDialog from "@/components/DeleteEntityDialog";

interface LeadActionsMenuProps {
  lead: Lead;
  onViewDetails?: () => void;
}

export default function LeadActionsMenu({
  lead,
  onViewDetails,
}: LeadActionsMenuProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { mutate: deleteLead, isPending: isDeleting } = useMutation(
    trpc.leads.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Lead deleted");
        setDeleteDialogOpen(false);
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete lead");
      },
    }),
  );

  const isBusy = isDeleting;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Open lead actions menu"
            disabled={isBusy}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              onViewDetails?.();
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/leads/$uid/edit" params={{ uid: lead.id }}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setDeleteDialogOpen(true);
            }}
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
        title="Delete lead?"
        description="This will permanently delete this lead. This action cannot be undone."
        isPending={isDeleting}
        onConfirm={() => deleteLead({ id: lead.id })}
      />
    </>
  );
}
