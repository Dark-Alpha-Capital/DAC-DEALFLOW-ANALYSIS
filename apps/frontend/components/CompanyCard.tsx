
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Eye, Pencil, Trash2 } from "lucide-react";
import type { Company } from "@repo/db";
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

type CompanyWithTheme = Company & { themeName?: string | null };

export default function CompanyCard({ company }: { company: CompanyWithTheme }) {
  const trpc = useTRPC();
  const router = useRouter();
  const { mutate: deleteCompany, isPending: isDeleting } = useMutation(
    trpc.companies.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Company deleted");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete company");
      },
    }),
  );
  const detailLink = `/companies/${company.id}`;

  return (
    <div className="flex flex-col border-b border-border bg-background py-5 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground">
            {company.coverageStatus}
          </span>
          <h3 className="mt-1.5 text-sm font-semibold text-foreground" title={company.name}>
            {company.name}
          </h3>
          {company.themeName && (
            <p className="text-[11px] text-muted-foreground">
              Theme: {company.themeName}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            <Building2 className="mr-1 inline h-3 w-3" />
            {company.industry ?? "—"}
            {company.location && (
              <>
                <span className="mx-1.5 text-border">·</span>
                {company.location}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
        {company.revenueEstimate != null && (
          <div>
            <span className="text-muted-foreground">Revenue</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(company.revenueEstimate)}
            </p>
          </div>
        )}
        {company.ebitdaEstimate != null && (
          <div>
            <span className="text-muted-foreground">EBITDA</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {formatCurrency(company.ebitdaEstimate)}
            </p>
          </div>
        )}
        {company.attractivenessScore != null && (
          <div>
            <span className="text-muted-foreground">Score</span>
            <p className="mt-0.5 font-medium tabular-nums text-foreground">
              {company.attractivenessScore}
            </p>
          </div>
        )}
        {company.location && (
          <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{company.location}</span>
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
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <Link to={`/companies/${company.id}/edit`}>
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
              <AlertDialogTitle>Delete company?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{company.name}&quot;. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCompany({ id: company.id })}
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
