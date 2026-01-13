"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { DealType, Sentiment } from "db/schema";
import EditScreeningResultDialog from "./Dialogs/edit-screen-result-dialog";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

interface AIReasoningProps {
  screeningId: string;
  title: string;
  dealId: string;
  dealType: DealType;
  explanation: string;
  sentiment: Sentiment;
}

export default function AIReasoning({
  title,
  explanation,
  sentiment,
  screeningId,
  dealId,
  dealType,
}: AIReasoningProps) {
  const trpc = useTRPC();

  const { mutate: deleteScreening, isPending } = useMutation(
    trpc.screenings.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Screening deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete screening");
      },
    }),
  );

  return (
    <Card className="mb-4 bg-muted">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge
          className={cn({
            "bg-positive text-positive-foreground": sentiment === "POSITIVE",
            "bg-negative text-negative-foreground": sentiment === "NEGATIVE",
            "bg-neutral-status text-neutral-status-foreground": sentiment === "NEUTRAL",
          })}
        >
          {sentiment}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {explanation}
        </p>
      </CardContent>
      <CardFooter className="space-x-2">
        <Button
          variant="destructive"
          onClick={() => deleteScreening({ screeningId, dealId })}
          disabled={isPending}
          aria-label="Delete AI Screening"
        >
          {isPending ? "Deleting..." : "Delete"}
        </Button>
        <EditScreeningResultDialog
          screeningId={screeningId}
          title={title}
          sentiment={sentiment}
          explanation={explanation}
          dealId={dealId}
          dealType={dealType}
        />
      </CardFooter>
    </Card>
  );
}
