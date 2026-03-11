"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { DealOpportunity } from "@repo/db/schema";

const STAGE_ORDER = [
  "LISTED",
  "INITIAL_REVIEW",
  "SCREENED",
  "MEETING_HELD",
  "IOI_SUBMITTED",
  "LOI_SUBMITTED",
  "DILIGENCE",
  "CLOSED",
  "DEAD",
] as const;

const STAGE_LABELS: Record<string, string> = {
  LISTED: "Listed",
  INITIAL_REVIEW: "Initial Review",
  SCREENED: "Screened",
  MEETING_HELD: "Meeting",
  IOI_SUBMITTED: "IOI",
  LOI_SUBMITTED: "LOI",
  DILIGENCE: "Diligence",
  CLOSED: "Closed",
  DEAD: "Dead",
};

interface DealPipelineSectionProps {
  dealId: string;
  currentOpportunity: DealOpportunity;
  compact?: boolean;
  inline?: boolean;
}

export function DealPipelineSection({
  dealId,
  currentOpportunity,
  compact = false,
  inline = false,
}: DealPipelineSectionProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const currentStage = currentOpportunity.stage ?? "LISTED";
  const currentLabel = STAGE_LABELS[currentStage] ?? currentStage;

  const { mutate: updateStage, isPending } = useMutation(
    trpc.dealOpportunities.updateOpportunityStage.mutationOptions({
      onSuccess: () => {
        toast.success("Deal stage updated");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update stage");
      },
    }),
  );

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {!compact && (
        <div>
          <h2 className="text-base font-semibold">Deal Pipeline Stage</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Current stage:{" "}
            <span className="text-foreground font-medium">{currentLabel}</span>
          </p>
        </div>
      )}
      <div
        className={
          inline
            ? "flex items-center gap-2"
            : compact
              ? "space-y-1"
              : "space-y-2"
        }
      >
        <Label className={inline ? "text-xs whitespace-nowrap" : "text-sm"}>
          {compact ? "Listing stage" : "Change stage"}
        </Label>
        <Select
          value={currentStage}
          onValueChange={(value) =>
            !isPending &&
            updateStage({
              id: dealId,
              stage: value as (typeof STAGE_ORDER)[number],
            })
          }
          disabled={isPending}
        >
          <SelectTrigger className={inline ? "w-[180px]" : "w-[200px]"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_ORDER.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {STAGE_LABELS[stage] ?? stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
