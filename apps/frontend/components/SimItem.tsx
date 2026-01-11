"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "./ui/button";
import { DealType } from "db/schema";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

interface SimItemProps {
  title: string;
  description: string;
  status: string;
  cimId: string;
  dealId: string;
  fileUrl: string;
  dealType: DealType;
}

const SimItem: React.FC<SimItemProps> = ({
  title,
  description,
  status,
  cimId,
  dealId,
  fileUrl,
  dealType,
}) => {
  const trpc = useTRPC();

  const { mutate: deleteSim, isPending } = useMutation(
    trpc.misc.deleteSim.mutationOptions({
      onSuccess: () => {
        toast.success("SIM deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete SIM");
      },
    })
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-success text-success-foreground";
      case "IN_PROGRESS":
        return "bg-warning text-warning-foreground";
      case "PENDING":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-info text-info-foreground";
    }
  };

  return (
    <Card className="mb-4 bg-muted">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className={getStatusColor(status)}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="">{description}</p>
      </CardContent>
      <CardFooter className="space-x-2">
        <Button>Edit</Button>
        <Button
          variant={"destructive"}
          disabled={isPending}
          onClick={() => deleteSim({ simId: cimId, dealId, fileUrl })}
        >
          {isPending ? "Deleting......" : "Delete"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SimItem;
