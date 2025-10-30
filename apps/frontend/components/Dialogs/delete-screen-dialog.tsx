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
import ScreenDealComponent from "@/components/ScreenDealComponent";
import { Button } from "../ui/button";
import { Trash } from "lucide-react";
import DeleteBaseline from "@/app/actions/delete-baseline";
import { useToast } from "@/hooks/use-toast";

const DeleteScreenerDialog = ({
  url,
  dealScreenerId,
}: {
  url: string;
  dealScreenerId: string;
}) => {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [isPending, startTransition] = React.useTransition();

  async function onClickHandler() {
    startTransition(async () => {
      // delete the screener
      const response = await DeleteBaseline(url, dealScreenerId);
      if (response.type === "success") {
        toast({
          title: "Screener deleted successfully",
          description: response.message,
          variant: "success",
        });

        setOpenDialog(false);
      }

      if (response.type === "error") {
        toast({
          title: "Could not delete Screener",
          description: response.message,
          variant: "destructive",
        });
      }
    });
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
