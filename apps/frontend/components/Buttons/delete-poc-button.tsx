"use client";
import { Trash } from "lucide-react";

import React from "react";
import { Button } from "../ui/button";
import deletePoc from "@/app/actions/delete-poc";
import { toast } from "sonner";

const DeletePocButton = ({
  pocId,
  dealId,
}: {
  pocId: string;
  dealId: string;
}) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="flex-shrink-0 text-destructive hover:text-destructive/80"
      onClick={async () => {
        const response = await deletePoc(pocId, dealId);
        if ("error" in response) {
          toast.error(response.error);
        } else {
          toast.success(response.message);
        }
      }}
    >
      <Trash className="h-4 w-4" />
      <span className="sr-only">Delete POC</span>
    </Button>
  );
};

export default DeletePocButton;
