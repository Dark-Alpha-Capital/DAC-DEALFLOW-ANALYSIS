import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { RankedDealOpportunityRow } from "@repo/db/queries";
import { DealActionsCell } from "./deal-actions-cell";

export type DealOppRow = RankedDealOpportunityRow;

export const columns: ColumnDef<DealOppRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
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
        {row.original.company?.name ?? row.original.opp.dealTeaser ?? "—"}
      </span>
    ),
    meta: { className: "text-left" },
    filterFn: (row, id, value) => {
      const val =
        row.original.company?.name ?? row.original.opp.dealTeaser ?? "";
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
