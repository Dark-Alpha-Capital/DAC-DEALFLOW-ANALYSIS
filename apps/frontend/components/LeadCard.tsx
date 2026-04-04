
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Eye, Pencil, Trash2 } from "lucide-react";
import type { Lead } from "@repo/db";
import { formatCurrency } from "@/lib/utils";
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
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

export default function LeadCard({ lead }: { lead: Lead }) {
  const trpc = useTRPC();
  const router = useRouter();
  const { mutate: deleteLead, isPending: isDeleting } = useMutation(
    trpc.leads.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Lead deleted");
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete lead");
      },
    }),
  );
  const detailLink = `/leads/${lead.id}`;
  const editLink = `/leads/${lead.id}/edit`;

  const titlePreview =
    lead.rawTitle.length > 60 ? lead.rawTitle.slice(0, 60) + "..." : lead.rawTitle;

  return (
    <div className="flex flex-col border-b border-border bg-background py-5 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground">
            {lead.status}
          </span>
          <h3 className="mt-1.5 text-sm font-semibold text-foreground" title={lead.rawTitle}>
            {titlePreview}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            <Building2 className="mr-1 inline h-3 w-3" />
            {lead.brokerage ?? "—"}
            {lead.normalizedCompanyName && (
              <>
                <span className="mx-1.5 text-border">·</span>
                {lead.normalizedCompanyName}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
        {lead.revenue != null && (
          <div>
            <span className="text-muted-foreground">Revenue</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(lead.revenue)}
            </p>
          </div>
        )}
        {lead.ebitda != null && (
          <div>
            <span className="text-muted-foreground">EBITDA</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(lead.ebitda)}
            </p>
          </div>
        )}
        {lead.askingPrice != null && (
          <div>
            <span className="text-muted-foreground">Asking</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(lead.askingPrice)}
            </p>
          </div>
        )}
        {lead.rawIndustry && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Industry</span>
            <p className="mt-0.5 text-foreground">{lead.rawIndustry}</p>
          </div>
        )}
        {lead.companyLocation && (
          <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{lead.companyLocation}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t border-border pt-4">
        <Button size="sm" className="flex-1 gap-1.5" asChild>
          <Link to={detailLink}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link to={editLink}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={isDeleting}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete lead?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this lead. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteLead({ id: lead.id })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
