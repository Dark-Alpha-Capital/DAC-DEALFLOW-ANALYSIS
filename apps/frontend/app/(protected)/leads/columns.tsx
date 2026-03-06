"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import type { Lead } from "@repo/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import LeadActionsMenu from "@/components/LeadActionsMenu";

export const leadStatusLabels: Record<string, string> = {
  NEW: "New",
  PROCESSED: "Processed",
  DUPLICATE: "Duplicate",
  REJECTED: "Rejected",
};

export const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "rawTitle",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="max-w-xs truncate font-medium">
        {row.getValue("rawTitle") || "—"}
      </span>
    ),
    filterFn: (row, id, value) => {
      const val = row.getValue(id) as string;
      return !value || val?.toLowerCase().includes(String(value).toLowerCase());
    },
  },
  {
    accessorKey: "rawIndustry",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Industry
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="max-w-[180px] truncate">
        {(row.getValue("rawIndustry") as string) || "—"}
      </span>
    ),
    filterFn: (row, id, value) => {
      const val = row.getValue(id) as string;
      return !value || val?.toLowerCase().includes(String(value).toLowerCase());
    },
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="text-right"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Revenue
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const val = row.getValue("revenue") as number | null;
      return (
        <span className="tabular-nums">
          {val != null ? formatCurrency(val) : "—"}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  {
    accessorKey: "ebitda",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="text-right"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        EBITDA
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const val = row.getValue("ebitda") as number | null;
      return (
        <span className="tabular-nums">
          {val != null ? formatCurrency(val) : "—"}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  {
    accessorKey: "sourceWebsite",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Source
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="max-w-[220px] truncate text-muted-foreground text-xs">
        {(row.getValue("sourceWebsite") as string) || "—"}
      </span>
    ),
    filterFn: (row, id, value) => {
      const val = row.getValue(id) as string;
      return !value || val?.toLowerCase().includes(String(value).toLowerCase());
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const label = leadStatusLabels[status] ?? status;
      const variant =
        status === "REJECTED"
          ? "destructive"
          : status === "PROCESSED"
            ? "default"
            : "secondary";
      return (
        <Badge variant={variant} className="text-xs font-medium">
          {label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true;
      return row.getValue(id) === value;
    },
  },
  {
    id: "actions",
    header: () => <span className="text-right">Actions</span>,
    cell: ({ row, table }) => {
      const lead = row.original;
      const onSelectLead = (table.options.meta as { onSelectLead?: (l: Lead) => void })
        ?.onSelectLead;
      return (
        <div className="text-right" onClick={(e) => e.stopPropagation()}>
          <LeadActionsMenu
            lead={lead}
            onViewDetails={() => onSelectLead?.(lead)}
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
