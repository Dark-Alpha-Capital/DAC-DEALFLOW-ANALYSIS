
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import DeleteEntityDialog from "@/components/DeleteEntityDialog";

export type CompanyWithTheme = import("@repo/db").Company & {
  themeName?: string | null;
};

function CompanyActionsCell({ company }: { company: CompanyWithTheme }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: deleteCompany, isPending: isDeleting } = useMutation(
    trpc.companies.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Company deleted");
        void router.invalidate();
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete company");
      },
    }),
  );
  return (
    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <Link
              to="/companies/$uid"
              params={{ uid: company.id }}
              className="flex items-center"
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/companies/$uid/edit"
              params={{ uid: company.id }}
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
        title="Delete company?"
        description={`This will permanently delete "${company.name}". This action cannot be undone.`}
        isPending={isDeleting}
        onConfirm={() => deleteCompany({ id: company.id })}
      />
    </div>
  );
}

export const coverageStatusLabels: Record<string, string> = {
  UNCONTACTED: "Uncontacted",
  CONTACTED: "Contacted",
  IN_DISCUSSION: "In Discussion",
  UNDER_LOI: "Under LOI",
  CLOSED: "Closed",
  PASSED: "Passed",
};

export const columns: ColumnDef<CompanyWithTheme>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Company
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="block truncate font-medium">
        {row.original.name ?? "—"}
      </span>
    ),
    filterFn: (row, id, value) => {
      const val = row.getValue(id) as string;
      return !value || val?.toLowerCase().includes(String(value).toLowerCase());
    },
    meta: { className: "text-left" },
  },
  {
    id: "revenueEstimate",
    accessorKey: "revenueEstimate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Revenue
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const val = row.original.revenueEstimate;
      return (
        <span className="tabular-nums">
          {val != null ? formatCurrency(val) : "—"}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  {
    id: "ebitdaEstimate",
    accessorKey: "ebitdaEstimate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        EBITDA
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const val = row.original.ebitdaEstimate;
      return (
        <span className="tabular-nums">
          {val != null ? formatCurrency(val) : "—"}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  {
    id: "coverageStatus",
    accessorKey: "coverageStatus",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.original.coverageStatus;
      const label = coverageStatusLabels[status] ?? status;
      const variant =
        status === "CLOSED"
          ? "default"
          : status === "PASSED"
            ? "secondary"
            : "outline";
      return (
        <Badge variant={variant} className="text-xs font-medium">
          {label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true;
      return row.original.coverageStatus === value;
    },
    meta: { className: "text-center" },
  },
  {
    id: "actions",
    header: () => <span className="block w-full text-center">Actions</span>,
    cell: ({ row }) => <CompanyActionsCell company={row.original} />,
    enableSorting: false,
    enableHiding: false,
    meta: { className: "text-center" },
  },
];
