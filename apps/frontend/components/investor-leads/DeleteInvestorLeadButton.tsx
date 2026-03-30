
import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "@/lib/navigation-shim";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import type { InvestorLead } from "@repo/db";

export function DeleteInvestorLeadButton({ lead }: { lead: InvestorLead }) {
  const router = useRouter();
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);

  const { mutate: deleteLead, isPending } = useMutation(
    trpc.investorLeads.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Investor lead deleted");
        setOpen(false);
        router.push("/investor-leads");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete investor lead");
      },
    }),
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete investor lead?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove{" "}
            <span className="font-medium">
              {lead.name || "this investor lead"}
            </span>
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={() => deleteLead({ id: lead.id })}
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
