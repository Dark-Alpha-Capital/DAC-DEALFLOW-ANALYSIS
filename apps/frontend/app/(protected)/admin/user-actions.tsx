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
import { blockUser, unblockUser } from "@/lib/actions/user-management";
import { AdminUser } from "db/types";

interface UserActionsProps {
  user: AdminUser;
}

export function UserActions({ user }: UserActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);

  const isAdmin = user.role === "ADMIN";

  async function handleBlock() {
    setIsLoading(true);
    try {
      const result = await blockUser(user.id);
      if (result.success) {
        toast.success(`${user.name || user.email} has been blocked`);
      } else {
        toast.error(result.error || "Failed to block user");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
      setShowBlockDialog(false);
    }
  }

  async function handleUnblock() {
    setIsLoading(true);
    try {
      const result = await unblockUser(user.id);
      if (result.success) {
        toast.success(`${user.name || user.email} has been unblocked`);
      } else {
        toast.error(result.error || "Failed to unblock user");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
      setShowUnblockDialog(false);
    }
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
                  className="text-green-600 focus:text-green-600"
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
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnblock}
              disabled={isLoading}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unblock User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
