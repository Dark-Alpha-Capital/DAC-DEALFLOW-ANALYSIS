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
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AddPocForm from "../forms/add-poc-form";

const AddPocDialog = ({ dealId }: { dealId: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mb-4">
          <Plus className="mr-2 h-4 w-4" /> Add POC
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Point of Contact</DialogTitle>
          <DialogDescription>
            Add a point of contact to the deal.
          </DialogDescription>
        </DialogHeader>
        <AddPocForm
          dealId={dealId}
          onSuccess={() => {
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddPocDialog;
