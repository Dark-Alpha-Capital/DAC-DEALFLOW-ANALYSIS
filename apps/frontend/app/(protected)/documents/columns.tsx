"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/utils";
import type { Document } from "db/schema";

export type DocumentRow = Document;

export const entityTypeLabels: Record<string, string> = {
  COMPANY: "Company",
  DEAL_OPPORTUNITY: "Deal",
  LEAD: "Lead",
};

export function getEntityRoute(entityType: string, entityId: string): string {
  switch (entityType) {
    case "COMPANY":
      return `/companies/${entityId}`;
    case "DEAL_OPPORTUNITY":
      return `/deals/${entityId}`;
    case "LEAD":
      return `/leads/${entityId}`;
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
      <span className="block truncate font-medium max-w-[200px]">
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
        <span className="tabular-nums text-muted-foreground text-sm">
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
        {row.original.category?.toLowerCase() ?? "—"}
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
      const entityRoute = getEntityRoute(doc.entityType, doc.entityId);
      return (
        <div
          className="flex justify-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.open(doc.fileUrl, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              const link = document.createElement("a");
              link.href = doc.fileUrl;
              link.download = doc.title;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link href={entityRoute}>Entity</Link>
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    meta: { className: "text-center" },
  },
];
