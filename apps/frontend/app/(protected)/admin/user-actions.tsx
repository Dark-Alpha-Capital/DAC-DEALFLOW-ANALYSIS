"use client";

import { useState } from "react";
import { MoreHorizontal, Ban, CheckCircle, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AdminUser } from "db/types";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

interface UserActionsProps {
  user: AdminUser;
}

export function UserActions({ user }: UserActionsProps) {
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const trpc = useTRPC();

  const { mutate: blockUser, isPending: isBlocking } = useMutation(
    trpc.users.block.mutationOptions({
      onSuccess: () => {
        toast.success(`${user.name || user.email} has been blocked`);
        setShowBlockDialog(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to block user");
        setShowBlockDialog(false);
      },
    })
  );

  const { mutate: unblockUser, isPending: isUnblocking } = useMutation(
    trpc.users.unblock.mutationOptions({
      onSuccess: () => {
        toast.success(`${user.name || user.email} has been unblocked`);
        setShowUnblockDialog(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to unblock user");
        setShowUnblockDialog(false);
      },
    })
  );

  const isAdmin = user.role === "ADMIN";
  const isLoading = isBlocking || isUnblocking;

  function handleBlock() {
    blockUser({ userId: user.id });
  }

  function handleUnblock() {
    unblockUser({ userId: user.id });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(user.id);
              toast.success("User ID copied to clipboard");
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy User ID
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(user.email);
              toast.success("Email copied to clipboard");
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {!isAdmin && (
            <>
              {user.isBlocked ? (
                <DropdownMenuItem
                  onClick={() => setShowUnblockDialog(true)}
                  className="text-success focus:text-success"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Unblock User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setShowBlockDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              )}
            </>
          )}
          {isAdmin && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Ban className="mr-2 h-4 w-4" />
              Cannot block admins
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block{" "}
              <span className="font-semibold">{user.name || user.email}</span>?
              They will not be able to access the platform until unblocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={isBlocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unblock{" "}
              <span className="font-semibold">{user.name || user.email}</span>?
              They will regain access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnblocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnblock}
              disabled={isUnblocking}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {isUnblocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unblock User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
