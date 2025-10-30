"use client";

import React, { useTransition } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import { DealType } from "@prisma/client";
import DeleteSimFromDB from "@/app/actions/delete-sim";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500";
      case "IN_PROGRESS":
        return "bg-yellow-500";
      case "PENDING":
        return "bg-red-500";
      default:
        return "bg-blue-500";
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
          onClick={async () => {
            startTransition(async () => {
              const response = await DeleteSimFromDB(
                cimId,
                dealType,
                dealId,
                fileUrl,
              );
              if (response.type === "success") {
                toast({
                  title: "SIM deleted successfully",
                  description: "The SIM has been deleted successfully",
                });
              }

              if (response.type === "error") {
                toast({
                  title: "Error deleting SIM",
                  description: response.message,
                  variant: "destructive",
                });
              }
            });
          }}
        >
          {isPending ? "Deleting......" : "Delete"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SimItem;
