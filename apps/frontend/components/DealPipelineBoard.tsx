import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useRouter } from "@/lib/navigation-shim";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import DealDetailsPanel from "@/components/DealDetailsPanel";
import {
  BITRIX_DEAL_PIPELINE_ID,
  type BitrixDealStageRow,
  normalizeBitrixStageIdForPipeline,
} from "@repo/bitrix-sync";

type DealOppRow = {
  opp: import("@repo/db").DealOpportunity;
  company: {
    name: string;
    industry: string | null;
    location: string | null;
  } | null;
};

type DealPipelineBoardProps = {
  data: DealOppRow[];
  pipelineStages: BitrixDealStageRow[];
};

export default function DealPipelineBoard({
  data,
  pipelineStages,
}: DealPipelineBoardProps) {
  const pipelineColumns = useMemo(() => {
    if (pipelineStages.length === 0) {
      return [{ id: "NEW", label: "Deals", stages: [] as string[] }];
    }
    return pipelineStages.map((s) => ({
      id: s.statusId,
      label: s.name,
      stages: [s.statusId],
    }));
  }, [pipelineStages]);

  function getColumnIdForStage(stage: string | null | undefined): string {
    const sid = normalizeBitrixStageIdForPipeline(
      stage?.trim() || "",
      BITRIX_DEAL_PIPELINE_ID,
    );
    const match = pipelineColumns.find((col) => col.stages.includes(sid));
    return match?.id ?? pipelineColumns[0]?.id ?? "NEW";
  }

  const [rows, setRows] = useState<DealOppRow[]>(data);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trpc = useTRPC();
  const router = useRouter();

  useEffect(() => {
    setRows(data);
  }, [data]);

  const { mutate: updateStage, isPending: isUpdating } = useMutation(
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

  const columns = useMemo(() => {
    const grouped: Record<string, DealOppRow[]> = {};
    for (const col of pipelineColumns) {
      grouped[col.id] = [];
    }

    for (const row of rows) {
      const columnId = getColumnIdForStage(
        row.opp.stage as string | null | undefined,
      );
      if (!grouped[columnId]) {
        grouped[columnId] = [];
      }
      grouped[columnId].push(row);
    }

    return pipelineColumns.map((col) => ({
      ...col,
      items: grouped[col.id] ?? [],
    }));
  }, [rows, pipelineColumns]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.opp.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const handleStageChange = (id: string, targetColumnId: string) => {
    const target = pipelineColumns.find((col) => col.id === targetColumnId);
    if (!target) return;

    // Optimistic local update
    setRows((prev) =>
      prev.map((row) =>
        row.opp.id === id
          ? {
              ...row,
              opp: { ...row.opp, stage: target.id },
            }
          : row,
      ),
    );

    updateStage({ id, stage: target.id });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      {/* Pipeline columns */}
      <div className="overflow-x-auto">
        <div className="flex min-w-full gap-4">
          {columns.map((column) => (
            <div
              key={column.id}
              className="bg-background flex min-w-[260px] flex-1 flex-col rounded-md border"
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{column.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {column.items.length}
                  </Badge>
                </div>
              </div>
              <div className="flex-1 space-y-2 p-3">
                {column.items.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No deals</p>
                ) : (
                  column.items.map((row) => (
                    <DealPipelineCard
                      key={row.opp.id}
                      row={row}
                      currentColumnId={column.id}
                      stageOptions={pipelineColumns}
                      onStageChange={handleStageChange}
                      onSelect={setSelectedId}
                      isSelected={row.opp.id === selectedId}
                      isUpdating={isUpdating}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details panel */}
      <div className="hidden lg:block">
        <DealDetailsPanel row={selectedRow} />
      </div>
    </div>
  );
}

type DealPipelineCardProps = {
  row: DealOppRow;
  currentColumnId: string;
  stageOptions: { id: string; label: string }[];
  isSelected: boolean;
  isUpdating: boolean;
  onStageChange: (id: string, targetColumnId: string) => void;
  onSelect: (id: string | null) => void;
};

function DealPipelineCard({
  row,
  currentColumnId,
  stageOptions,
  isSelected,
  isUpdating,
  onStageChange,
  onSelect,
}: DealPipelineCardProps) {
  const title =
    row.company?.name ??
    row.opp.title?.trim() ??
    row.opp.dealTeaser ??
    "Deal";
  const detailHref = `/deal-opportunities/${row.opp.id}`;

  return (
    <div
      className={cn(
        "bg-card hover:bg-muted/60 cursor-pointer rounded-md border p-3 text-xs transition-colors",
        isSelected && "ring-primary ring-2",
      )}
      onClick={() => onSelect(row.opp.id)}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-medium">
            {row.opp.stage} · {row.opp.status}
          </p>
          <p className="text-foreground mt-1 truncate text-sm font-semibold">
            {title}
          </p>
          {row.company?.industry && (
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {row.company.industry}
            </p>
          )}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2">
        {row.opp.revenue != null && (
          <div>
            <p className="text-muted-foreground text-[10px]">Revenue</p>
            <p className="text-[11px] font-medium tabular-nums">
              {formatCurrency(row.opp.revenue)}
            </p>
          </div>
        )}
        {row.opp.ebitda != null && (
          <div>
            <p className="text-muted-foreground text-[10px]">EBITDA</p>
            <p className="text-[11px] font-medium tabular-nums">
              {formatCurrency(row.opp.ebitda)}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <select
          className="bg-background h-8 flex-1 rounded-md border px-2 text-[11px]"
          value={currentColumnId}
          onChange={(e) => {
            e.stopPropagation();
            onStageChange(row.opp.id, e.target.value);
          }}
          disabled={isUpdating}
        >
          {stageOptions.map((col) => (
            <option key={col.id} value={col.id}>
              {col.label}
            </option>
          ))}
        </select>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Link to={detailHref}>View</Link>
        </Button>
      </div>
    </div>
  );
}
