"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export type CompanyWithTheme = import("db").Company & {
  themeName?: string | null;
};

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
        status === "CLOSED" ? "default" : status === "PASSED" ? "secondary" : "outline";
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
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button asChild size="sm" variant="outline">
            <Link href={`/companies/${id}`}>View</Link>
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    meta: { className: "text-center" },
  },
];
