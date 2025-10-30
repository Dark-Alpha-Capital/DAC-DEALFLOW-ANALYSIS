"use client";

import { Upload, Loader2 } from "lucide-react";
import React, { useTransition } from "react";
import { Button } from "../ui/button";
import { Deal } from "@prisma/client";
import { exportDealToBitrix } from "@/app/actions/upload-bitrix";
import { toast } from "sonner";

const UploadDealToBitrixButton = ({ specificDeal }: { specificDeal: Deal }) => {
  const [isPending, startTransition] = useTransition();

  const uploadDealToBitrix = async () => {
    startTransition(async () => {
      try {
        const response = await exportDealToBitrix(specificDeal);
        console.log(response);
        toast.success("Successfully published deal to Bitrix");
      } catch (error) {
        console.error(error);
        toast.error("Error publishing deal to Bitrix");
      }
    });
  };

  return (
    <Button onClick={uploadDealToBitrix} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Upload className="mr-2 h-4 w-4" />
      )}
      {isPending ? "Publishing..." : "Publish to Bitrix"}
    </Button>
  );
};

export default UploadDealToBitrixButton;
