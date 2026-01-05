"use client";
import { Trash } from "lucide-react";

import React from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const DeletePocButton = ({
  pocId,
  dealId,
}: {
  pocId: string;
  dealId: string;
}) => {
  const trpc = useTRPC();

  const { mutate: deletePoc } = useMutation(
    trpc.pocs.delete.mutationOptions({
      onSuccess: () => {
        toast.success("POC deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete POC");
      },
    })
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      className="flex-shrink-0 text-destructive hover:text-destructive/80"
      onClick={() => deletePoc({ pocId, dealId })}
    >
      <Trash className="h-4 w-4" />
      <span className="sr-only">Delete POC</span>
    </Button>
  );
};

export default DeletePocButton;
