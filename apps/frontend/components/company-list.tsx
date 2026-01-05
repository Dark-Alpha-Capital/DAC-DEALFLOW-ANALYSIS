"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building2, MapPin, Users, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import DeleteCompanyDialog from "@/components/Dialogs/delete-company-dialog";
import { useTRPC } from "@/trpc/client";
import { CompanyWithRelationsForList } from "db/types";

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
    })
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

        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          {company.headquarters && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{company.headquarters}</span>
            </div>
          )}
          {company.employees && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 shrink-0" />
              <span>{company.employees.toLocaleString()} employees</span>
            </div>
          )}
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{company.website}</span>
            </a>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Revenue
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {company.revenue ? formatCurrency(company.revenue) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              EBITDA
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {company.ebitda ? formatCurrency(company.ebitda) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-[10px] text-muted-foreground">
          <span>{company._count.files} files</span>
          <span>{company._count.sections} sections</span>
          <span>{company._count.reviews} reviews</span>
          <span>{company._count.tasks} tasks</span>
        </div>
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
  onSearch?: (search: string) => void;
  onPageChange?: (page: number) => void;
}

export default function CompanyList({
  companies,
  totalCount,
  totalPages,
  currentPage = 1,
  onSearch,
  onPageChange,
}: CompanyListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchTerm);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? "company" : "companies"}
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-48 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-16">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {searchTerm ? "No results found" : "No companies yet"}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/companies/new">Add Company</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
