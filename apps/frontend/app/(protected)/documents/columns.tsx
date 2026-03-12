"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/utils";
import type { Document } from "@repo/db/schema";
import { DocumentActionsDropdown } from "./document-actions-dropdown";

export type DocumentRow = Document;

export const entityTypeLabels: Record<string, string> = {
  COMPANY: "Company",
  DEAL_OPPORTUNITY: "Deal opportunity",
  LEAD: "Lead",
  THEME: "Investment theme",
  GLOBAL: "Firm",
};

export function getEntityRoute(
  entityType: string,
  entityId: string | null,
): string {
  switch (entityType) {
    case "COMPANY":
      return `/companies/${entityId ?? ""}`;
    case "DEAL_OPPORTUNITY":
      return `/deal-opportunities/${entityId ?? ""}`;
    case "LEAD":
      return `/leads/${entityId ?? ""}`;
    case "THEME":
      return `/investment-themes/${entityId ?? ""}`;
    case "GLOBAL":
      return "/documents";
    default:
      return "#";
  }
}

export const columns: ColumnDef<DocumentRow>[] = [
  {
    id: "title",
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="justify-start"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        File
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="block max-w-[200px] truncate font-medium">
        {row.original.title ?? "—"}
      </span>
    ),
    filterFn: (row, id, value) => {
      const val = row.getValue(id) as string;
      return !value || val?.toLowerCase().includes(String(value).toLowerCase());
    },
    meta: { className: "text-left" },
  },
  {
    id: "entityType",
    accessorKey: "entityType",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Entity
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const entityType = row.original.entityType;
      const label = entityTypeLabels[entityType] ?? entityType;
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (!value || value === "all") return true;
      return row.original.entityType === value;
    },
    meta: { className: "text-center" },
  },
  {
    id: "fileSize",
    accessorKey: "fileSize",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Size
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const size = row.original.fileSize;
      return (
        <span className="text-muted-foreground text-sm tabular-nums">
          {size != null ? formatFileSize(size) : "—"}
        </span>
      );
    },
    meta: { className: "text-right" },
  },
  {
    id: "category",
    accessorKey: "category",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-center"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Category
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm capitalize">
        {row.original.category
          ?.toLowerCase()
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "—"}
      </span>
    ),
    meta: { className: "text-center" },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Uploaded
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleDateString()
          : "—"}
      </span>
    ),
    meta: { className: "text-right" },
  },
  {
    id: "actions",
    header: () => <span className="block w-full text-center">Actions</span>,
    cell: ({ row }) => {
      const doc = row.original;
      return (
        <div
          className="flex justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <DocumentActionsDropdown doc={doc} />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    meta: { className: "text-center" },
  },
];
