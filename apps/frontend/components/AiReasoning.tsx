"use client";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { DealType, Sentiment } from "@repo/db/schema";
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
  score?: number | null;
}

export default function AIReasoning({
  title,
  explanation,
  sentiment,
  score,
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
    <div className="mb-4 border-b border-border pb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="flex items-center gap-2">
          {score != null && (
            <span className="tabular-nums text-xs font-medium text-foreground">
              Score: {score}
            </span>
          )}
          <span
            className={cn(
              "text-xs font-medium",
              sentiment === "POSITIVE" && "text-foreground",
              sentiment === "NEGATIVE" && "text-destructive",
              sentiment === "NEUTRAL" && "text-muted-foreground",
            )}
          >
            Sentiment: {sentiment}
          </span>
        </div>
      </div>
      <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {explanation}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
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
      </div>
    </div>
  );
}
