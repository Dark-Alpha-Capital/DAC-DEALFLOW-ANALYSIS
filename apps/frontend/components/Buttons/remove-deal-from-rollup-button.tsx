"use client";

import { Button } from "@/components/ui/button";
import { removeDealFromRollup } from "@/app/actions/rollup-actions";
import { toast } from "sonner";
import { useTransition } from "react";

interface RemoveDealFromRollupButtonProps {
  dealId: string;
  rollupId: string;
  userRole?: string;
}

export default function RemoveDealFromRollupButton({
  dealId,
  rollupId,
  userRole,
}: RemoveDealFromRollupButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    if (userRole !== "ADMIN") {
      toast.error("Only admins can remove deals.");
      return;
    }

    startTransition(async () => {
      const result = await removeDealFromRollup(dealId, rollupId);
      if (result.success) {
        toast.success("Deal removed successfully!");
      } else {
        toast.error(result.error || "Failed to remove deal.");
      }
    });
  };

  return (
    <Button
      size="sm"
      variant={userRole === "ADMIN" ? "destructive" : "secondary"}
      disabled={userRole !== "ADMIN" || isPending}
      onClick={handleRemove}
      className="mt-2"
    >
      {isPending
        ? "Removing..."
        : userRole === "ADMIN"
          ? "Remove Deal"
          : "Only admins can remove deals"}
    </Button>
  );
}
