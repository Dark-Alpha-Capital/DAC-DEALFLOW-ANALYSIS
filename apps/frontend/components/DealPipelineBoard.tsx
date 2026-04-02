
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
};

const PIPELINE_COLUMNS: {
  id: string;
  label: string;
  stages: string[];
}[] = [
  { id: "LISTED", label: "Listed", stages: ["LISTED", "INITIAL_REVIEW"] },
  { id: "SCREENED", label: "Screened", stages: ["SCREENED"] },
  { id: "MEETING_HELD", label: "Meeting", stages: ["MEETING_HELD"] },
  { id: "IOI_SUBMITTED", label: "IOI", stages: ["IOI_SUBMITTED"] },
  { id: "LOI_SUBMITTED", label: "LOI", stages: ["LOI_SUBMITTED"] },
  { id: "DILIGENCE", label: "Diligence", stages: ["DILIGENCE"] },
  { id: "CLOSED", label: "Closed", stages: ["CLOSED", "DEAD"] },
];

function getColumnIdForStage(stage: string | null | undefined): string {
  if (!stage) return "LISTED";
  const match = PIPELINE_COLUMNS.find((col) => col.stages.includes(stage));
  return match?.id ?? "LISTED";
}

export default function DealPipelineBoard({ data }: DealPipelineBoardProps) {
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
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update stage");
      },
    }),
  );

  const columns = useMemo(() => {
    const grouped: Record<string, DealOppRow[]> = {};
    for (const col of PIPELINE_COLUMNS) {
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

    return PIPELINE_COLUMNS.map((col) => ({
      ...col,
      items: grouped[col.id] ?? [],
    }));
  }, [rows]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.opp.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const handleStageChange = (id: string, targetColumnId: string) => {
    const target = PIPELINE_COLUMNS.find((col) => col.id === targetColumnId);
    if (!target) return;

    // Optimistic local update
    setRows((prev) =>
      prev.map((row) =>
        row.opp.id === id
          ? {
              ...row,
              opp: { ...row.opp, stage: target.id as any },
            }
          : row,
      ),
    );

    updateStage({ id, stage: target.id as any });
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
  isSelected: boolean;
  isUpdating: boolean;
  onStageChange: (id: string, targetColumnId: string) => void;
  onSelect: (id: string | null) => void;
};

function DealPipelineCard({
  row,
  currentColumnId,
  isSelected,
  isUpdating,
  onStageChange,
  onSelect,
}: DealPipelineCardProps) {
  const title = row.company?.name ?? row.opp.dealTeaser ?? "Deal";
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
          {PIPELINE_COLUMNS.map((col) => (
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
