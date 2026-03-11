"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Grid, List } from "lucide-react";
import DealCard from "@/components/DealCard";
import DealListItem from "@/components/DealListItem";
import type { Deal, UserRole } from "@repo/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { BulkScreenDialog } from "./Dialogs/bulk-screen-dialog";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

interface DealContainerProps {
  data: Deal[];

  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function DealContainer({ data }: DealContainerProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const trpc = useTRPC();

  const { mutate: bulkDeleteDeals, isPending: isDeleting } = useMutation(
    trpc.dealOpportunities.bulkDelete.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setSelectedIds(new Set());
        toast.success("Deals deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete deals");
      },
    }),
  );

  const allSelected = data.length > 0 && selectedIds.size === data.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(data.map((d) => d.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkDelete() {
    bulkDeleteDeals({ dealIds: Array.from(selectedIds) });
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-label="Grid view"
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-label="List view"
          >
            <List className="h-5 w-5" />
          </button>
        </div>

        {viewMode === "list" && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <span>Select All</span>
            </label>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!selectedIds.size}>
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to delete these?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    these deals from the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Continue"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <BulkScreenDialog selectedIds={Array.from(selectedIds)} />
          </div>
        )}
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {data.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {data.map((deal) => (
            <DealListItem
              key={deal.id}
              deal={deal}
              selected={selectedIds.has(deal.id)}
              onToggle={() => toggleOne(deal.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
