
import * as React from "react";
import { ColumnDef, type Row } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "@/lib/navigation-shim";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import type { InvestorLead } from "@repo/db";

export const investorLeadStatusLabels: Record<string, string> = {
  RAW: "Raw",
  CONTACTED: "Contacted",
  ENGAGED: "Engaged",
  QUALIFIED: "Qualified",
  REJECTED: "Rejected",
};

function ActionsCell({ row }: { row: Row<InvestorLead> }) {
  const router = useRouter();
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);

  const lead = row.original;

  const { mutate: deleteLead, isPending } = useMutation(
    trpc.investorLeads.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Investor lead deleted");
        setOpen(false);
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete investor lead");
      },
    }),
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-40"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/investor-leads/${lead.id}`);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/investor-leads/${lead.id}/edit`);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent
        onClick={(e) => {
          // prevent row click while interacting with dialog
          e.stopPropagation();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete investor lead?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove{" "}
            <span className="font-medium">
              {lead.name || "this investor lead"}
            </span>
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={(e) => {
              e.stopPropagation();
              deleteLead({ id: lead.id });
            }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const columns: ColumnDef<InvestorLead>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="max-w-xs truncate font-medium">
        {row.getValue("name") || "—"}
      </span>
    ),
    filterFn: (row, id, value) => {
      const val = row.getValue(id) as string;
      return !value || val?.toLowerCase().includes(String(value).toLowerCase());
    },
  },
  {
    accessorKey: "source",
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
      <span className="max-w-[180px] truncate">
        {(row.getValue("source") as string) || "—"}
      </span>
    ),
    filterFn: (row, id, value) => {
      const val = row.getValue(id) as string;
      return !value || val?.toLowerCase().includes(String(value).toLowerCase());
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate">
        {(row.getValue("email") as string) || "—"}
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
      const label = investorLeadStatusLabels[status] ?? status;
      const variant =
        status === "REJECTED"
          ? "destructive"
          : status === "QUALIFIED"
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
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <ActionsCell row={row} />,
    meta: {
      className: "w-0 pr-2 text-right",
    },
  },
];
