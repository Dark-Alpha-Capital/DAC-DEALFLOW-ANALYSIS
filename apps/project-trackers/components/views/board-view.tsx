import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  workItemStatusBadgeClass,
  workItemStatusLabel,
  workItemPriorityColor,
} from "@/lib/work-item-display";
import type { WorkItemStatusValue, WorkItemPriorityValue } from "@repo/enums";
import { WORK_ITEM_STATUS_VALUES } from "@repo/enums";
import {
  AlertCircle, ArrowUp, ArrowRight, ArrowDown, Minus,
} from "lucide-react";

type WorkItemRecord = {
  id: string;
  trackerId: string;
  epicId: string | null;
  cycleId: string | null;
  moduleId: string | null;
  title: string;
  description: string;
  status: WorkItemStatusValue;
  priority: WorkItemPriorityValue;
  startDate: Date | null;
  dueDate: Date | null;
  estimatePoints: number | null;
  estimateHours: number | null;
  sequence: number | null;
  tags: string[];
  assignees: string[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function PriorityIcon({ priority, className }: { priority: WorkItemPriorityValue; className?: string }) {
  const cls = cn("size-3 shrink-0", workItemPriorityColor(priority), className);
  switch (priority) {
    case "URGENT": return <AlertCircle className={cls} />;
    case "HIGH": return <ArrowUp className={cls} />;
    case "MEDIUM": return <ArrowRight className={cls} />;
    case "LOW": return <ArrowDown className={cls} />;
    case "NONE": return <Minus className={cls} />;
  }
}

function BoardColumn({
  status,
  items,
  onItemClick,
  onItemMove,
}: {
  status: WorkItemStatusValue;
  items: WorkItemRecord[];
  onItemClick: (item: WorkItemRecord) => void;
  onItemMove: (itemId: string, status: WorkItemStatusValue) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg p-3 min-w-[240px] flex-1 transition-colors",
        isOver ? "bg-primary/10 ring-1 ring-primary/40" : "bg-muted/30",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isOver) setIsOver(true);
      }}
      onDragLeave={(e) => {
        // only clear when leaving the column, not when moving over children
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const itemId = e.dataTransfer.getData("text/plain");
        if (itemId) onItemMove(itemId, status);
      }}
    >
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
            Drop items here
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", item.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="bg-card ring-border/50 hover:ring-primary/30 w-full cursor-grab rounded-lg p-3 text-left ring-1 transition-shadow active:cursor-grabbing"
              onClick={() => onItemClick(item)}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <PriorityIcon priority={item.priority} />
                <p className="text-sm font-medium truncate">{item.title}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
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
  trackerId: _trackerId,
  items,
  onItemClick,
  onItemMove,
}: {
  trackerId: string;
  items: WorkItemRecord[];
  onItemClick: (item: WorkItemRecord) => void;
  onItemMove: (itemId: string, status: WorkItemStatusValue) => void;
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
          onItemMove={onItemMove}
        />
      ))}
    </div>
  );
}
