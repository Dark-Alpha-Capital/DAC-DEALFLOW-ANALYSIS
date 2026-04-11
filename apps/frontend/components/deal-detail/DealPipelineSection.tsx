
import { useRouter } from "@/lib/navigation-shim";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { resolveBitrixStageLabel } from "@repo/bitrix-sync";

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
  const { data: pipelineStages = [] } = useQuery(
    trpc.dealOpportunities.getBitrixPipelineStages.queryOptions(),
  );

  const currentStage = currentOpportunity.stage?.trim() || "";
  const currentLabel =
    pipelineStages.length > 0
      ? resolveBitrixStageLabel(currentStage, pipelineStages)
      : currentStage || "—";

  const { mutate: updateStage, isPending } = useMutation(
    trpc.dealOpportunities.updateOpportunityStage.mutationOptions({
      onSuccess: () => {
        toast.success("Deal stage updated");
        void router.invalidate();
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
          value={currentStage || undefined}
          onValueChange={(value) =>
            !isPending &&
            updateStage({
              id: dealId,
              stage: value,
            })
          }
          disabled={isPending || pipelineStages.length === 0}
        >
          <SelectTrigger className={inline ? "w-[180px]" : "w-[200px]"}>
            <SelectValue placeholder={pipelineStages.length === 0 ? "No stages" : "Select stage"} />
          </SelectTrigger>
          <SelectContent>
            {pipelineStages.map((s) => (
              <SelectItem key={s.statusId} value={s.statusId}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
