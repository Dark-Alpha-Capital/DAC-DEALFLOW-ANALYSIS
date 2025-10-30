"use client";

import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { User } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import blockAccount from "@/app/actions/block-account";
import unblockAccount from "@/app/actions/unblock-account";

export const columns: ColumnDef<User>[] = [
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
  },

  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "isBlocked",
    header: "Blocked",
    cell: ({ row }) => {
      const user = row.original;
      return user.isBlocked ? (
        <Badge>Yes</Badge>
      ) : (
        <Badge variant={"destructive"}>No</Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy Account ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                const userId = user.id;

                try {
                  await blockAccount(userId);
                  alert("Account blocked successfully");
                } catch (error) {
                  alert("an error occurred");

                  // toast({
                  //   title: "Error while trying to block account",
                  //   description: "Server Side Error Occurred",
                  //   variant: "destructive", //
                  // });
                }
              }}
            >
              Block Account
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                const userId = user.id;

                try {
                  await unblockAccount(userId);
                  alert("Account was given access");
                } catch (error) {
                  alert("an error occurred!!!");

                  // toast({
                  //   title: "Error while trying to block account",
                  //   description: "Server Side Error Occurred",
                  //   variant: "destructive", //
                  // });
                }
              }}
            >
              Give Account Access
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
