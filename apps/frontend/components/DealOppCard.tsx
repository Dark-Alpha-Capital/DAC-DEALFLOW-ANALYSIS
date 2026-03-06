"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Eye, Pencil, Trash2 } from "lucide-react";
import type { DealOpportunity } from "db";
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
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

type DealOppCardProps = {
  opp: DealOpportunity;
  company: { name: string; industry: string | null; location: string | null } | null;
};

export default function DealOppCard({ opp, company }: DealOppCardProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const { mutate: deleteDeal, isPending: isDeleting } = useMutation(
    trpc.deals.deleteOpportunity.mutationOptions({
      onSuccess: () => {
        toast.success("Deal deleted");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete deal");
      },
    }),
  );

  const detailLink = `/deals/${opp.id}`;
  const title = company?.name ?? opp.dealTeaser ?? "Deal";

  return (
    <div className="flex flex-col border-b border-border bg-background py-5 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground">
            {opp.stage} · {opp.status}
          </span>
          <h3 className="mt-1.5 text-sm font-semibold text-foreground" title={title}>
            {title.length > 60 ? title.slice(0, 60) + "..." : title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            <Building2 className="mr-1 inline h-3 w-3" />
            {opp.brokerage ?? "—"}
            {company?.industry && (
              <>
                <span className="mx-1.5 text-border">·</span>
                {company.industry}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
        {opp.revenue != null && (
          <div>
            <span className="text-muted-foreground">Revenue</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(opp.revenue)}
            </p>
          </div>
        )}
        {opp.ebitda != null && (
          <div>
            <span className="text-muted-foreground">EBITDA</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(opp.ebitda)}
            </p>
          </div>
        )}
        {opp.askingPrice != null && (
          <div>
            <span className="text-muted-foreground">Asking</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(opp.askingPrice)}
            </p>
          </div>
        )}
        {company?.location && (
          <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{company.location}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t border-border pt-4">
        <Button size="sm" className="flex-1 gap-1.5" asChild>
          <Link href={detailLink}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <Link href={`/deals/${opp.id}/edit`}>
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
              <AlertDialogTitle>Delete deal?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this deal. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDeal({ id: opp.id })}
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
