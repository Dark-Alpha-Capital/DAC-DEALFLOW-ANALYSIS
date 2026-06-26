import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutGrid, List, Calendar, GanttChart, Save, Trash2 } from "lucide-react";
import { VIEW_TYPE_LABELS, VIEW_TYPE_VALUES, type ViewTypeValue } from "@repo/enums";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewRecord = {
  id: string;
  name: string;
  type: ViewTypeValue;
  filters: string;
  sortConfig: string;
  groupBy: string | null;
  displayProps: string;
  isDefault: boolean;
};

export function ViewSelector({
  trackerId,
  activeView,
  onViewChange,
}: {
  trackerId: string;
  activeView: { type: ViewTypeValue; filters: Record<string, unknown> };
  onViewChange: (view: { type: ViewTypeValue; filters: Record<string, unknown> }) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const listQuery = trpc.views.listByTracker.queryOptions({ trackerId });
  const { data: savedViews = [] } = useQuery(listQuery);

  const { mutate: createView } = useMutation(
    trpc.views.create.mutationOptions({
      onSuccess: () => {
        toast.success("View saved");
        setShowSave(false);
        setSaveName("");
        void queryClient.invalidateQueries(listQuery);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const { mutate: deleteView } = useMutation(
    trpc.views.delete.mutationOptions({
      onSuccess: () => {
        toast.success("View deleted");
        void queryClient.invalidateQueries(listQuery);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleSave() {
    if (!saveName.trim()) return;
    createView({
      trackerId,
      name: saveName.trim(),
      type: activeView.type,
      filters: activeView.filters,
      sortConfig: {},
      displayProps: {},
      isDefault: false,
    });
  }

  const iconMap: Record<ViewTypeValue, React.ReactNode> = {
    list: <List className="size-4" />,
    board: <LayoutGrid className="size-4" />,
    timeline: <GanttChart className="size-4" />,
    calendar: <Calendar className="size-4" />,
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="bg-muted/50 flex rounded-lg p-0.5">
        {VIEW_TYPE_VALUES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onViewChange({ type, filters: activeView.filters })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeView.type === type
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {iconMap[type]}
            {VIEW_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setShowSave(!showSave)}
      >
        <Save className="size-3.5" />
        Save view
      </Button>

      {showSave && (
        <div className="flex items-center gap-1.5">
          <Input
            className="h-8 w-40 text-xs"
            placeholder="View name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleSave}>
            Save
          </Button>
        </div>
      )}

      {savedViews.length > 0 && (
        <Select
          value=""
          onValueChange={(v) => {
            if (v === "none") return;
            const view = savedViews.find((sv) => sv.id === v);
            if (view) {
              try {
                const filters = JSON.parse(view.filters);
                onViewChange({ type: view.type as ViewTypeValue, filters });
              } catch {
                onViewChange({ type: view.type as ViewTypeValue, filters: {} });
              }
            }
          }}
        >
          <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-transparent text-xs shadow-none">
            <SelectValue placeholder="Saved views" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Saved views</SelectItem>
            {savedViews.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                <span className="flex items-center gap-2">
                  {iconMap[v.type as ViewTypeValue]}
                  {v.name}
                  {v.isDefault && <span className="text-muted-foreground text-[10px]">(default)</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
