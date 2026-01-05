"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const DeleteScreenerButton = ({ screenerId }: { screenerId: string }) => {
  const trpc = useTRPC();

  const { mutate: deleteScreener } = useMutation(
    trpc.screeners.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Screener deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete screener");
      },
    })
  );

  return (
    <div>
      <Button
        variant="destructive"
        size="icon"
        onClick={() => deleteScreener({ screenerId })}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DeleteScreenerButton;
