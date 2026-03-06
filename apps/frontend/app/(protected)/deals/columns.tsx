"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export type DealOppRow = {
  opp: import("db").DealOpportunity;
  company: {
    name: string;
    industry: string | null;
    location: string | null;
  } | null;
};

export const stageLabels: Record<string, string> = {
  LISTED: "Listed",
  INITIAL_REVIEW: "Initial Review",
  SCREENED: "Screened",
  MEETING_HELD: "Meeting",
  IOI_SUBMITTED: "IOI",
  LOI_SUBMITTED: "LOI",
  DILIGENCE: "Diligence",
  CLOSED: "Closed",
  DEAD: "Dead",
};

export const columns: ColumnDef<DealOppRow>[] = [
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
    id: "stage",
    accessorFn: (row) => row.opp.stage,
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Stage
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const stage = row.original.opp.stage;
      const label = stageLabels[stage] ?? stage;
      const variant =
        stage === "CLOSED" || stage === "DEAD"
          ? "secondary"
          : stage === "DILIGENCE" || stage === "LOI_SUBMITTED"
            ? "default"
            : "outline";
      return (
        <Badge variant={variant} className="text-xs font-medium">
          {label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true;
      return row.original.opp.stage === value;
    },
    meta: { className: "text-center" },
  },
  {
    id: "actions",
    header: () => <span className="block w-full text-center">Actions</span>,
    cell: ({ row }) => {
      const id = row.original.opp.id;
      return (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Button asChild size="sm" variant="outline">
            <Link href={`/deals/${id}`}>View</Link>
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    meta: { className: "text-center" },
  },
];
