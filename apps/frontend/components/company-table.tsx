"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { CompanyWithRelationsForList } from "db/types";
import DeleteCompanyDialog from "@/components/Dialogs/delete-company-dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

interface CompanyTableProps {
  companies: CompanyWithRelationsForList[];
}

export default function CompanyTable({ companies }: CompanyTableProps) {
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

  const handleDelete = (id: string) => {
    deleteCompany({ id });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Sector</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              No companies found.
            </TableCell>
          </TableRow>
        ) : (
          companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/companies/${company.id}`}
                  className="text-primary hover:underline"
                >
                  {company.name}
                </Link>
              </TableCell>
              <TableCell>{company.sector || "—"}</TableCell>
              <TableCell>
                {company.revenue
                  ? formatCurrency(Number(company.revenue))
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/companies/${company.id}`}>View</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/companies/${company.id}/due-diligence`}>
                      DD
                    </Link>
                  </Button>
                  <DeleteCompanyDialog
                    companyName={company.name}
                    onDelete={() => handleDelete(company.id)}
                    isDeleting={isPending}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
