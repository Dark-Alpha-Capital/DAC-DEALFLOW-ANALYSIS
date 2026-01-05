"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const DeleteScreenerDialog = ({
  url,
  dealScreenerId,
}: {
  url: string;
  dealScreenerId: string;
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const trpc = useTRPC();

  const { mutate: deleteBaseline, isPending } = useMutation(
    trpc.misc.deleteBaseline.mutationOptions({
      onSuccess: () => {
        toast.success("Screener deleted successfully");
        setOpenDialog(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete screener");
      },
    })
  );

  function onClickHandler() {
    deleteBaseline({ blobUrl: url, questionnaireId: dealScreenerId });
  }

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button variant={"destructive"} className="absolute right-2 top-2">
          <Trash className="" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This screener and all its content will be deleted. This action
            cannot be reversed
          </DialogDescription>

          <Button
            className="w-full"
            variant={"destructive"}
            disabled={isPending}
            onClick={onClickHandler}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteScreenerDialog;
