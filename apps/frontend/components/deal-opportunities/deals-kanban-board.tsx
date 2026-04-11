import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { RankedDealOpportunityRow } from "@repo/db/queries";
import type { BitrixDealStageRow } from "@repo/bitrix-sync";
import {
  BITRIX_DEAL_PIPELINE_ID,
  getDefaultBitrixStageId,
  normalizeBitrixStageIdForPipeline,
} from "@repo/bitrix-sync";
import { useRouter } from "@/lib/navigation-shim";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { KanbanDealOpportunityActions } from "./kanban-deal-card-actions";

const STAGE_COLUMN_PREFIX = "stage-column:";

const COLUMN_HEADER_CLASSES = [
  "bg-violet-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-violet-600",
  "bg-blue-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-blue-600",
  "bg-fuchsia-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-fuchsia-600",
  "bg-orange-500 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-orange-500",
  "bg-sky-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-sky-600",
  "bg-cyan-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-cyan-600",
  "bg-amber-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-amber-600",
  "bg-emerald-700 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-emerald-700",
  "bg-rose-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-rose-600",
  "bg-indigo-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-indigo-600",
  "bg-teal-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-teal-600",
  "bg-zinc-600 text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] dark:bg-zinc-600",
] as const;

function headerClassForColumnIndex(i: number): string {
  return COLUMN_HEADER_CLASSES[i % COLUMN_HEADER_CLASSES.length]!;
}

function parseStageFromDroppableId(
  overId: string | number,
  allowedIds: Set<string>,
): string | null {
  const s = String(overId);
  if (!s.startsWith(STAGE_COLUMN_PREFIX)) return null;
  const stage = s.slice(STAGE_COLUMN_PREFIX.length);
  if (!allowedIds.has(stage)) return null;
  return stage;
}

function groupByBitrixStage(
  rows: RankedDealOpportunityRow[],
  pipelineStages: BitrixDealStageRow[],
  fallbackStageId: string,
): Map<string, RankedDealOpportunityRow[]> {
  const map = new Map<string, RankedDealOpportunityRow[]>();
  for (const col of pipelineStages) {
    map.set(col.statusId, []);
  }
  const fb = fallbackStageId.trim();
  if (!map.has(fb)) {
    map.set(fb, []);
  }
  const fallbackBucket = map.get(fb)!;
  for (const row of rows) {
    const raw = row.opp.stage?.trim() || fb;
    const id = normalizeBitrixStageIdForPipeline(raw, BITRIX_DEAL_PIPELINE_ID);
    const bucket = map.get(id);
    if (bucket) bucket.push(row);
    else fallbackBucket.push(row);
  }
  return map;
}

function KanbanDealCardBody({ row }: { row: RankedDealOpportunityRow }) {
  const status = row.screening?.status ?? "UNSCREENED";
  const badgeVariant =
    status === "PASS"
      ? "default"
      : status === "FAIL"
        ? "destructive"
        : "secondary";
  const rev = row.opp.revenue;
  const ebitda = row.opp.ebitda;
  const hasRev = rev != null && Number.isFinite(rev);
  const hasEbitda = ebitda != null && Number.isFinite(ebitda);
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant={badgeVariant}
          className="px-1.5 py-0 text-[0.65rem] font-medium leading-tight"
        >
          {status}
        </Badge>
      </div>
      {hasRev || hasEbitda ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {hasRev ? (
            <div className="min-w-0">
              <p className="text-muted-foreground text-[0.65rem] leading-none">
                Revenue
              </p>
              <p className="text-foreground mt-0.5 text-xs font-medium tabular-nums leading-tight">
                {formatCurrency(rev)}
              </p>
            </div>
          ) : null}
          {hasEbitda ? (
            <div className="min-w-0">
              <p className="text-muted-foreground text-[0.65rem] leading-none">
                EBITDA
              </p>
              <p className="text-foreground mt-0.5 text-xs font-medium tabular-nums leading-tight">
                {formatCurrency(ebitda)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function KanbanDraggableCard({
  row,
  stage,
  onNavigate,
  ignoreNextClickRef,
}: {
  row: RankedDealOpportunityRow;
  stage: string;
  onNavigate: (id: string) => void;
  ignoreNextClickRef: React.MutableRefObject<boolean>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: row.opp.id,
      data: { type: "deal", stage },
    });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const title =
    row.company?.name ??
    row.opp.title?.trim() ??
    row.opp.dealTeaser ??
    "Untitled deal";
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-[0.45]")}
    >
      <Card
        className={cn(
          "group/card cursor-grab overflow-hidden rounded-lg border-0 bg-muted/40 shadow-none transition-colors duration-200 active:cursor-grabbing",
          "dark:bg-zinc-900/60",
          "hover:bg-muted/55 dark:hover:bg-zinc-900/80",
          "motion-reduce:transition-none",
        )}
        {...listeners}
        {...attributes}
      >
        <div className="space-y-2 p-2.5 sm:p-3">
          <button
            type="button"
            className="text-foreground hover:text-primary w-full cursor-pointer rounded-md py-0 text-left text-sm leading-snug font-semibold tracking-tight transition-colors duration-200 touch-manipulation motion-reduce:transition-none"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (ignoreNextClickRef.current) {
                ignoreNextClickRef.current = false;
                return;
              }
              onNavigate(row.opp.id);
            }}
          >
            <span className="line-clamp-2" title={title}>
              {title}
            </span>
          </button>
          <KanbanDealCardBody row={row} />
          <KanbanDealOpportunityActions dealOpportunityId={row.opp.id} />
        </div>
      </Card>
    </div>
  );
}

const KANBAN_COL_WIDTH_PX = 312;

function StageDropColumn({
  stage,
  label,
  columnIndex,
  dealCount,
  children,
}: {
  stage: string;
  label: string;
  columnIndex: number;
  dealCount: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${STAGE_COLUMN_PREFIX}${stage}`,
    data: { type: "column", stage },
  });
  const headerTone = headerClassForColumnIndex(columnIndex);
  return (
    <div
      ref={setNodeRef}
      style={{ width: KANBAN_COL_WIDTH_PX }}
      className={cn(
        "flex h-full min-h-[16rem] shrink-0 flex-col overflow-hidden rounded-xl bg-muted/15 dark:bg-zinc-950/40",
        "transition-colors duration-200 motion-reduce:transition-none",
        isOver && "bg-primary/[0.04] dark:bg-primary/[0.06]",
      )}
      aria-label={`${label}, ${dealCount} ${dealCount === 1 ? "deal" : "deals"}`}
    >
      <div
        className={cn(
          "shrink-0 px-4 py-4 text-sm font-semibold leading-tight tracking-tight sm:px-5 sm:py-4",
          headerTone,
        )}
      >
        {label}{" "}
        <span className="font-bold tabular-nums opacity-95">({dealCount})</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain p-4 touch-pan-y sm:gap-5 sm:p-5">
        {children}
      </div>
    </div>
  );
}

export function DealsKanbanBoard({
  deals,
  pipelineStages,
}: {
  deals: RankedDealOpportunityRow[];
  pipelineStages: BitrixDealStageRow[];
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const fallbackStageId = React.useMemo(
    () => getDefaultBitrixStageId(pipelineStages),
    [pipelineStages],
  );
  const stageIdSet = React.useMemo(
    () => new Set(pipelineStages.map((s) => s.statusId)),
    [pipelineStages],
  );
  const [localDeals, setLocalDeals] =
    React.useState<RankedDealOpportunityRow[]>(deals);
  const [activeRow, setActiveRow] =
    React.useState<RankedDealOpportunityRow | null>(null);
  const localDealsRef = React.useRef(localDeals);
  const ignoreNextCardClickRef = React.useRef(false);

  React.useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);

  React.useEffect(() => {
    localDealsRef.current = localDeals;
  }, [localDeals]);

  const byStage = React.useMemo(
    () =>
      pipelineStages.length > 0
        ? groupByBitrixStage(localDeals, pipelineStages, fallbackStageId)
        : new Map<string, RankedDealOpportunityRow[]>(),
    [localDeals, pipelineStages, fallbackStageId],
  );

  const updateStage = useMutation(
    trpc.dealOpportunities.updateOpportunityStage.mutationOptions({
      onMutate: async ({ id, stage: nextStage }) => {
        let previous: RankedDealOpportunityRow[] = [];
        setLocalDeals((prev) => {
          previous = prev;
          return prev.map((r) =>
            r.opp.id === id
              ? { ...r, opp: { ...r.opp, stage: nextStage } }
              : r,
          );
        });
        return { previous };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous) setLocalDeals(ctx.previous);
        toast.error("Could not update stage");
      },
      onSuccess: () => {
        toast.success("Stage updated");
        void router.invalidate();
      },
    }),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
  );

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    const row = localDealsRef.current.find((r) => r.opp.id === id) ?? null;
    setActiveRow(row);
  }, []);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      setActiveRow(null);
      const { active, over } = event;
      if (!over) return;
      if (String(active.id) === String(over.id)) return;
      const dealId = String(active.id);
      const columnStage = parseStageFromDroppableId(over.id, stageIdSet);
      const overDealStage = localDealsRef.current.find(
        (r) => r.opp.id === String(over.id),
      )?.opp.stage;
      const newStage = columnStage ?? overDealStage ?? null;
      if (newStage == null) return;
      const fromStage = active.data.current?.stage as string | undefined;
      if (fromStage == null || fromStage === newStage) return;
      ignoreNextCardClickRef.current = true;
      updateStage.mutate({ id: dealId, stage: newStage });
    },
    [updateStage, stageIdSet],
  );

  const handleDragCancel = React.useCallback(() => {
    setActiveRow(null);
  }, []);

  const navigateToDeal = React.useCallback(
    (id: string) => {
      void router.push(`/deal-opportunities/${id}`);
    },
    [router],
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScrollArrows = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const eps = 4;
    setCanScrollLeft(scrollLeft > eps);
    setCanScrollRight(scrollLeft < maxScroll - eps);
  }, []);

  React.useLayoutEffect(() => {
    updateScrollArrows();
  }, [localDeals, updateScrollArrows]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollArrows();
    el.addEventListener("scroll", updateScrollArrows, { passive: true });
    const ro = new ResizeObserver(updateScrollArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollArrows);
      ro.disconnect();
    };
  }, [updateScrollArrows]);

  const scrollBoard = React.useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(320, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 sm:space-y-8">
      {pipelineStages.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No Bitrix pipeline stages loaded. Set{" "}
          <code className="text-xs">BITRIX_DEAL_STAGES_JSON</code> or run{" "}
          <code className="text-xs">fetch-stages</code> in{" "}
          <code className="text-xs">@repo/bitrix-sync</code>.
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className="my-2 flex min-h-[calc(100dvh-15rem)] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl bg-muted/10 sm:my-3 sm:min-h-[calc(100dvh-13rem)] md:min-h-[calc(100dvh-12rem)] lg:min-h-[calc(100dvh-11.5rem)] dark:bg-zinc-950/25"
          role="region"
          aria-label="Deal pipeline board"
        >
          <div className="flex min-h-[3.25rem] shrink-0 items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Scroll pipeline left"
              disabled={!canScrollLeft}
              className="h-11 w-11 shrink-0 cursor-pointer rounded-lg transition-opacity duration-200 hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none dark:hover:bg-zinc-800/60"
              onClick={() => scrollBoard(-1)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Scroll pipeline right"
              disabled={!canScrollRight}
              className="h-11 w-11 shrink-0 cursor-pointer rounded-lg transition-opacity duration-200 hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none dark:hover:bg-zinc-800/60"
              onClick={() => scrollBoard(1)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          </div>
          <div
            ref={scrollRef}
            className="deal-kanban-h-scroll flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth px-3 pb-4 pt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:scroll-auto sm:px-4 sm:pb-5 sm:pt-3"
            tabIndex={0}
          >
            <div className="flex h-full min-h-0 w-max min-w-0 flex-1 items-stretch gap-6 px-1 py-1 sm:gap-8 sm:px-2 md:gap-10 [&>div]:border-r [&>div]:border-border [&>div:last-child]:border-r-0">
              {pipelineStages.map((col, columnIndex) => {
                const columnDeals = byStage.get(col.statusId) ?? [];
                return (
                  <StageDropColumn
                    key={col.statusId}
                    stage={col.statusId}
                    label={col.name}
                    columnIndex={columnIndex}
                    dealCount={columnDeals.length}
                  >
                    {columnDeals.length === 0 ? (
                      <div className="min-h-0 flex-1" aria-hidden />
                    ) : (
                      columnDeals.map((row) => (
                        <KanbanDraggableCard
                          key={row.opp.id}
                          row={row}
                          stage={col.statusId}
                          onNavigate={navigateToDeal}
                          ignoreNextClickRef={ignoreNextCardClickRef}
                        />
                      ))
                    )}
                  </StageDropColumn>
                );
              })}
            </div>
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeRow ? (
            <Card
              className="cursor-grabbing overflow-hidden rounded-lg border-0 bg-muted/50 p-2.5 shadow-lg dark:bg-zinc-900/90 sm:p-3"
              style={{ width: KANBAN_COL_WIDTH_PX }}
            >
              <div className="space-y-2">
                <p className="line-clamp-2 text-sm font-semibold leading-snug">
                  {activeRow.company?.name ??
                    activeRow.opp.title?.trim() ??
                    activeRow.opp.dealTeaser ??
                    "Untitled deal"}
                </p>
                <KanbanDealCardBody row={activeRow} />
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
