import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  workItemStatusBadgeClass,
  workItemStatusLabel,
} from "@/lib/work-item-display";
import type { WorkItemStatusValue } from "@repo/enums";
import { WORK_ITEM_STATUS_VALUES } from "@repo/enums";

type WorkItemRecord = {
  id: string;
  trackerId: string;
  epicId: string | null;
  cycleId: string | null;
  moduleId: string | null;
  title: string;
  description: string;
  status: WorkItemStatusValue;
  startDate: Date | null;
  dueDate: Date | null;
  estimatePoints: number | null;
  estimateHours: number | null;
  tags: string[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function BoardColumn({
  status,
  items,
  onItemClick,
}: {
  status: WorkItemStatusValue;
  items: WorkItemRecord[];
  onItemClick: (item: WorkItemRecord) => void;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 min-w-[240px] flex-1">
      <div className="mb-3 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            workItemStatusBadgeClass(status),
          )}
        >
          {workItemStatusLabel(status)}
        </span>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[100px]">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-6">
            No items
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="bg-card ring-border/50 hover:ring-primary/30 w-full rounded-lg p-3 text-left ring-1 transition-shadow cursor-pointer"
              onClick={() => onItemClick(item)}
            >
              <p className="text-sm font-medium truncate">{item.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {item.estimatePoints != null && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {item.estimatePoints} pts
                  </Badge>
                )}
                {item.estimateHours != null && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {item.estimateHours}h
                  </Badge>
                )}
                {item.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function BoardView({
  trackerId,
  items,
  onItemClick,
}: {
  trackerId: string;
  items: WorkItemRecord[];
  onItemClick: (item: WorkItemRecord) => void;
}) {
  const columns = WORK_ITEM_STATUS_VALUES.map((status) => ({
    status,
    items: items.filter((item) => item.status === status),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
      {columns.map((col) => (
        <BoardColumn
          key={col.status}
          status={col.status}
          items={col.items}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
