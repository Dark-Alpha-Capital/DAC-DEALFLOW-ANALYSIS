
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import type { RankedDealOpportunityRow } from "@repo/db/queries";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import DeleteEntityDialog from "@/components/DeleteEntityDialog";

export type DealOppRow = RankedDealOpportunityRow;

function DealActionsCell({ dealOpportunityId }: { dealOpportunityId: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: deleteOpportunity, isPending: isDeleting } = useMutation(
    trpc.dealOpportunities.deleteOpportunity.mutationOptions({
      onSuccess: () => {
        toast.success("Deal opportunity deleted");
        router.push("/deal-opportunities");
        router.refresh();
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete deal opportunity");
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
            <Link to={`/deal-opportunities/${dealOpportunityId}`} className="flex items-center">
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/deal-opportunities/${dealOpportunityId}/edit`}
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
        title="Delete deal opportunity?"
        description="This will permanently delete this deal opportunity. This action cannot be undone."
        onConfirm={() => deleteOpportunity({ id: dealOpportunityId })}
        isPending={isDeleting}
      />
    </div>
  );
}

export const columns: ColumnDef<DealOppRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { className: "w-10" },
  },
  {
    id: "title",
    accessorFn: (row) => row.company?.name ?? row.opp.dealTeaser ?? "Deal",
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
        {row.original.company?.name ??
          row.original.opp.dealTeaser ??
          "—"}
      </span>
    ),
    meta: { className: "text-left" },
    filterFn: (row, id, value) => {
      const val =
        row.original.company?.name ??
        row.original.opp.dealTeaser ??
        "";
      return !value || val?.toLowerCase().includes(String(value).toLowerCase());
    },
  },
  {
    id: "screeningStatus",
    accessorFn: (row) => row.screening?.status ?? "UNSCREENED",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Screening
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.original.screening?.status ?? "UNSCREENED";
      const variant =
        status === "PASS"
          ? "default"
          : status === "FAIL"
            ? "destructive"
            : "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true;
      return (row.original.screening?.status ?? "UNSCREENED") === value;
    },
    sortingFn: (rowA, rowB) => {
      const order: Record<string, number> = {
        PASS: 0,
        INCOMPLETE: 1,
        FAIL: 2,
        UNSCREENED: 3,
      };
      const left = order[rowA.original.screening?.status ?? "UNSCREENED"] ?? 99;
      const right =
        order[rowB.original.screening?.status ?? "UNSCREENED"] ?? 99;
      return left - right;
    },
    meta: { className: "text-left" },
  },
  {
    id: "revenue",
    accessorFn: (row) => row.opp.revenue,
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
      const val = row.original.opp.revenue;
      return (
        <span className="tabular-nums">
          {val != null ? formatCurrency(val) : "—"}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  {
    id: "ebitda",
    accessorFn: (row) => row.opp.ebitda,
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
      const val = row.original.opp.ebitda;
      return (
        <span className="tabular-nums">
          {val != null ? formatCurrency(val) : "—"}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  {
    id: "actions",
    header: () => <span className="block w-full text-center">Actions</span>,
    cell: ({ row }) => (
      <DealActionsCell dealOpportunityId={row.original.opp.id} />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { className: "text-center" },
  },
];
