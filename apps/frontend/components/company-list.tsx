"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Grid, List, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import DeleteCompanyDialog from "@/components/Dialogs/delete-company-dialog";
import { useTRPC } from "@/trpc/client";
import { CompanyWithRelationsForList } from "db/types";
import CompanyTable from "@/components/company-table";
import Pagination from "@/components/pagination";

interface CompanyCardProps {
  company: CompanyWithRelationsForList;
}

function CompanyCard({ company }: CompanyCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const trpc = useTRPC();

  const { mutate: deleteCompany, isPending } = useMutation(
    trpc.companies.delete.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Company Deleted",
          description: "Company deleted successfully",
          variant: "default",
        });
        router.refresh();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete company",
          variant: "destructive",
        });
      },
    }),
  );

  const handleDelete = () => {
    deleteCompany({ id: company.id });
  };

  return (
    <article className="group flex flex-col border border-border bg-card p-5 transition-colors hover:bg-accent/50">
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/companies/${company.id}`}
              className="block truncate text-base font-medium text-foreground hover:text-primary"
            >
              {company.name}
            </Link>
            {company.sector && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {company.sector}
              </p>
            )}
          </div>
          <DeleteCompanyDialog
            companyName={company.name}
            onDelete={handleDelete}
            isDeleting={isPending}
          />
        </div>

        {company.revenue && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Revenue
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {formatCurrency(Number(company.revenue))}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1 text-xs">
          <Link href={`/companies/${company.id}`}>View</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1 text-xs">
          <Link href={`/companies/${company.id}/due-diligence`}>
            Due Diligence
          </Link>
        </Button>
      </div>
    </article>
  );
}

interface CompanyListProps {
  companies: CompanyWithRelationsForList[];
  totalCount: number;
  totalPages: number;
  currentPage?: number;
}

export default function CompanyList({
  companies,
  totalCount,
  totalPages,
  currentPage = 1,
}: CompanyListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? "company" : "companies"}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-label="Grid view"
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
              viewMode === "table"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-label="Table view"
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-16">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No companies found
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/companies/new">Add Company</Link>
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <CompanyTable companies={companies} />
      )}

      {totalPages > 1 && <Pagination totalPages={totalPages} />}
    </div>
  );
}
