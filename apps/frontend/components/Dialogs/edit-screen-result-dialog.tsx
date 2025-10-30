"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import EditScreeningResultForm from "../forms/edit-screening-result-form";
import { DealType, Sentiment } from "@prisma/client";

const EditScreeningResultDialog = ({
  screeningId,
  dealId,
  dealType,
  title,
  explanation,
  sentiment,
}: {
  screeningId: string;
  dealId: string;
  dealType: DealType;
  title: string;
  explanation: string;
  sentiment: Sentiment;
}) => {
  const [openDialog, setOpenDialog] = React.useState(false);

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button>Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Screening Result</DialogTitle>
          <DialogDescription></DialogDescription>
          <EditScreeningResultForm
            screeningId={screeningId}
            title={title}
            sentiment={sentiment}
            explanation={explanation}
            setDialogClose={handleDialogClose}
            dealId={dealId}
            dealType={dealType}
          />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default EditScreeningResultDialog;
