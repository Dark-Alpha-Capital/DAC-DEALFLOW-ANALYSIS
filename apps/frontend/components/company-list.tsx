"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Building2,
  Users,
  FileText,
  CheckSquare,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import DeleteCompanyDialog from "@/components/Dialogs/delete-company-dialog";
import DeleteCompany from "@/app/actions/delete-company";

interface Company {
  id: string;
  name: string;
  website?: string;
  sector?: string;
  stage?: string;
  headquarters?: string;
  description?: string;
  revenue?: number;
  ebitda?: number;
  growthRate?: number;
  employees?: number;
  createdAt: string;
  founders: any[];
  files: any[];
  sections: any[];
  _count: {
    files: number;
    sections: number;
    reviews: number;
    tasks: number;
  };
}

interface CompanyCardProps {
  company: Company;
}

function CompanyCard({ company }: CompanyCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const formatStage = (stage?: string) => {
    if (!stage) return null;
    const stageColors = {
      STARTUP: "bg-blue-100 text-blue-800",
      GROWTH: "bg-green-100 text-green-800",
      MATURE: "bg-gray-100 text-gray-800",
      TURNAROUND: "bg-yellow-100 text-yellow-800",
      DISTRESSED: "bg-red-100 text-red-800",
    };
    return (
      <Badge
        className={
          stageColors[stage as keyof typeof stageColors] ||
          "bg-gray-100 text-gray-800"
        }
      >
        {stage.replace("_", " ")}
      </Badge>
    );
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await DeleteCompany(company.id);

        if (result.type === "success") {
          toast({
            title: "Company Deleted",
            description: result.message,
            variant: "default",
          });
          router.refresh();
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error deleting company:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              <Link
                href={`/companies/${company.id}`}
                className="transition-colors hover:text-primary"
              >
                {company.name}
              </Link>
            </CardTitle>
            {company.sector && (
              <CardDescription>{company.sector}</CardDescription>
            )}
          </div>
          {formatStage(company.stage)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          {company.headquarters && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {company.headquarters}
            </div>
          )}
          {company.employees && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              {company.employees.toLocaleString()} employees
            </div>
          )}
          {company.website && (
            <div className="flex items-center gap-2">
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {company.website}
              </a>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Revenue</p>
            <p className="font-medium">
              {company.revenue ? formatCurrency(company.revenue) : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">EBITDA</p>
            <p className="font-medium">
              {company.ebitda ? formatCurrency(company.ebitda) : "N/A"}
            </p>
          </div>
        </div>

        {/* Due Diligence Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Due Diligence Progress
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {company._count.files} files
            </div>
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {company._count.sections} sections
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {company._count.reviews} reviews
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {company._count.tasks} tasks
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/companies/${company.id}`}>View Details</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/companies/${company.id}/due-diligence`}>
              Due Diligence
            </Link>
          </Button>
        </div>

        {/* Delete Button */}
        <div className="pt-2">
          <DeleteCompanyDialog
            companyName={company.name}
            onDelete={handleDelete}
            isDeleting={isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface CompanyListProps {
  companies: Company[];
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
      {/* Search and Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Companies</h2>
          <p className="text-muted-foreground">
            {totalCount} {totalCount === 1 ? "company" : "companies"} found
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No companies found</h3>
            <p className="mb-4 text-center text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Get started by adding your first company"}
            </p>
            <Button asChild>
              <Link href="/companies/new">Add Company</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
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
