"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import { formatDate } from "./utils";
import type { ThemeDetailTabProps } from "./types";
import type { ThemePerformance } from "@repo/db";

export function ThemePerformanceTab({
  theme,
  performanceHistory,
}: ThemeDetailTabProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  const [perfObservedAt, setPerfObservedAt] = useState("");
  const [perfDealsSourced, setPerfDealsSourced] = useState("");
  const [perfMeetingsHeld, setPerfMeetingsHeld] = useState("");
  const [perfLoisIssued, setPerfLoisIssued] = useState("");
  const [perfDealsClosed, setPerfDealsClosed] = useState("");
  const [perfEntryMultiple, setPerfEntryMultiple] = useState("");
  const [perfIrr, setPerfIrr] = useState("");

  const { mutate: createPerformanceSnapshot, isPending: isSavingPerformance } =
    useMutation(
      trpc.themes.performanceCreateSnapshot.mutationOptions({
        onSuccess: () => {
          toast.success("Performance snapshot saved");
          setPerfObservedAt("");
          setPerfDealsSourced("");
          setPerfMeetingsHeld("");
          setPerfLoisIssued("");
          setPerfDealsClosed("");
          setPerfEntryMultiple("");
          setPerfIrr("");
          setFormOpen(false);
          router.refresh();
        },
        onError: (error) =>
          toast.error(error.message || "Failed to save performance snapshot"),
      }),
    );

  const {
    mutate: deletePerformanceSnapshot,
    isPending: isDeletingPerformance,
  } = useMutation(
    trpc.themes.performanceDeleteSnapshot.mutationOptions({
      onSuccess: () => {
        toast.success("Snapshot deleted");
        router.refresh();
      },
      onError: (error) =>
        toast.error(error.message || "Failed to delete snapshot"),
    }),
  );

  const handleSave = () =>
    createPerformanceSnapshot({
      themeId: theme.id,
      observedAt: perfObservedAt || undefined,
      dealsSourced: perfDealsSourced || undefined,
      meetingsHeld: perfMeetingsHeld || undefined,
      loisIssued: perfLoisIssued || undefined,
      dealsClosed: perfDealsClosed || undefined,
      averageEntryMultiple: perfEntryMultiple || undefined,
      averageIRR: perfIrr || undefined,
    });

  return (
    <div className="space-y-6">
      <ResponsiveFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Add performance snapshot"
        trigger={
          <Button size="sm">Add performance snapshot</Button>
        }
        footer={
          <Button
            disabled={isSavingPerformance}
            onClick={handleSave}
          >
            {isSavingPerformance ? "Saving..." : "Save snapshot"}
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            type="date"
            value={perfObservedAt}
            onChange={(e) => setPerfObservedAt(e.target.value)}
          />
          <Input
            placeholder="Deals sourced"
            value={perfDealsSourced}
            onChange={(e) => setPerfDealsSourced(e.target.value)}
          />
          <Input
            placeholder="Meetings held"
            value={perfMeetingsHeld}
            onChange={(e) => setPerfMeetingsHeld(e.target.value)}
          />
          <Input
            placeholder="LOIs issued"
            value={perfLoisIssued}
            onChange={(e) => setPerfLoisIssued(e.target.value)}
          />
          <Input
            placeholder="Deals closed"
            value={perfDealsClosed}
            onChange={(e) => setPerfDealsClosed(e.target.value)}
          />
          <Input
            placeholder="Avg entry multiple"
            value={perfEntryMultiple}
            onChange={(e) => setPerfEntryMultiple(e.target.value)}
          />
          <Input
            placeholder="Avg IRR (%)"
            value={perfIrr}
            onChange={(e) => setPerfIrr(e.target.value)}
          />
        </div>
      </ResponsiveFormModal>

      <div className="space-y-2 rounded-md border p-4">
        <h3 className="text-sm font-semibold">Performance history</h3>
        {performanceHistory.length === 0 ? (
          <p className="text-muted-foreground text-xs">No snapshots yet.</p>
        ) : (
          <div className="space-y-2">
            {performanceHistory.map((snapshot: ThemePerformance) => (
              <div
                key={snapshot.id}
                className="bg-muted/30 flex items-center justify-between gap-3 rounded border p-2 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-medium">
                    Observed {formatDate(snapshot.observedAt)}
                  </p>
                  <p className="text-muted-foreground">
                    Deals: {snapshot.dealsSourced ?? "—"} · Meetings:{" "}
                    {snapshot.meetingsHeld ?? "—"} · LOIs:{" "}
                    {snapshot.loisIssued ?? "—"} · Closed:{" "}
                    {snapshot.dealsClosed ?? "—"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDeletingPerformance}
                  onClick={() =>
                    deletePerformanceSnapshot({
                      id: snapshot.id,
                      themeId: theme.id,
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
