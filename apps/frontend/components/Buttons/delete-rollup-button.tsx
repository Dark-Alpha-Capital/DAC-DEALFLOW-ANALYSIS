"use client";

import { Button } from "@/components/ui/button";
import { deleteRollup } from "@/app/actions/rollup-actions";
import { toast } from "sonner";
import { useTransition } from "react";

interface DeleteRollupButtonProps {
  rollupId: string;
  userRole?: string;
}

export default function DeleteRollupButton({
  rollupId,
  userRole,
}: DeleteRollupButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (userRole !== "ADMIN") {
      toast.error("Only admins can delete rollups.");
      return;
    }

    startTransition(async () => {
      const result = await deleteRollup(rollupId);
      if (result.success) {
        toast.success("Rollup deleted successfully!");
      } else {
        toast.error(result.error || "Failed to delete rollup.");
      }
    });
  };

  return (
    <Button
      size="sm"
      variant={userRole === "ADMIN" ? "destructive" : "secondary"}
      disabled={userRole !== "ADMIN" || isPending}
      onClick={handleDelete}
    >
      {isPending
        ? "Deleting..."
        : userRole === "ADMIN"
          ? "Delete Rollup"
          : "Only admins can delete"}
    </Button>
  );
}
