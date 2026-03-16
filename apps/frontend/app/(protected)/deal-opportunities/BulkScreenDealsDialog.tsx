"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, Filter } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import useCurrentUser from "@/hooks/use-current-user";

type ScreeningType = "ai" | "manual" | null;

interface BulkScreenDealsDialogProps {
  selectedIds: string[];
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export function BulkScreenDealsDialog({
  selectedIds,
  onSuccess,
  children,
}: BulkScreenDealsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const content = (
    <BulkScreenContent
      selectedIds={selectedIds}
      onSuccess={() => {
        setOpen(false);
        onSuccess?.();
      }}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children ?? (
            <Button variant="outline" disabled={!selectedIds.length}>
              Screen Selected
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Screen Selected Deals</DialogTitle>
            <DialogDescription>
              Choose the type of screening to run on {selectedIds.length} deal
              {selectedIds.length === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children ?? (
          <Button variant="outline" disabled={!selectedIds.length}>
            Screen Selected
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Screen Selected Deals</DrawerTitle>
          <DrawerDescription>
            Choose the type of screening to run on {selectedIds.length} deal
            {selectedIds.length === 1 ? "" : "s"}.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          {content}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function BulkScreenContent({
  selectedIds,
  onSuccess,
}: {
  selectedIds: string[];
  onSuccess: () => void;
}) {
  const [screeningType, setScreeningType] = React.useState<ScreeningType>(null);
  const [selectedScreenerId, setSelectedScreenerId] = React.useState<
    string | null
  >(null);
  const user = useCurrentUser();
  const trpc = useTRPC();

  const { data: screeners, error, isLoading } = useQuery(
    trpc.screeners.getAll.queryOptions(),
  );

  const { mutate: bulkScreen, isPending: isBulkScreenPending } = useMutation(
    trpc.screenings.bulkScreen.mutationOptions({
      onSuccess: (responseData) => {
        if (responseData.ok && responseData.jobs) {
          const jobData = responseData.jobs.map((job) => ({
            jobId: job.jobId,
            dealId: job.dealId,
            userId: user?.id || "",
            userEmail: user?.email || "",
          }));
          window.dispatchEvent(new CustomEvent("newJobs", { detail: jobData }));
        }
        toast.success("Deals added to queue");
        onSuccess();
      },
      onError: (error) => {
        console.error(error);
        toast.error("Something went wrong");
      },
    }),
  );

  const { mutate: bulkManualScreen, isPending: isBulkManualPending } =
    useMutation(
      trpc.screenings.bulkManualScreen.mutationOptions({
        onSuccess: (responseData) => {
          if (responseData.ok && responseData.jobs) {
            const jobData = responseData.jobs.map((job) => ({
              jobId: job.jobId,
              dealId: job.dealOpportunityId,
              userId: user?.id || "",
              userEmail: user?.email || "",
            }));
            window.dispatchEvent(new CustomEvent("newJobs", { detail: jobData }));
          }
          toast.success("Deals added to queue");
          onSuccess();
        },
        onError: (error) => {
          console.error(error);
          toast.error("Something went wrong");
        },
      }),
    );

  const isPending = isBulkScreenPending || isBulkManualPending;

  // Step 1: Choose screening type
  if (screeningType === null) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-2 p-4"
          onClick={() => setScreeningType("ai")}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Screening
          </span>
          <span className="text-muted-foreground text-left text-sm font-normal">
            Uses AI with screener questionnaire to evaluate deals
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-2 p-4"
          onClick={() => setScreeningType("manual")}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Manual Screening
          </span>
          <span className="text-muted-foreground text-left text-sm font-normal">
            Deterministic hard filter (EBITDA, industry, revenue)
          </span>
        </Button>
      </div>
    );
  }

  // Step 2a: AI Screening - select screener
  if (screeningType === "ai") {
    if (error) {
      return (
        <div className="flex justify-center py-6 text-destructive">
          Failed to load screeners.
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="flex justify-center py-6">
          <span className="animate-pulse text-muted-foreground">
            Loading screeners...
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => {
            setScreeningType(null);
            setSelectedScreenerId(null);
          }}
        >
          ← Back
        </Button>
        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="screener-select"
          >
            Select Screener
          </label>
          <select
            id="screener-select"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedScreenerId ?? ""}
            onChange={(e) => setSelectedScreenerId(e.target.value || null)}
          >
            <option value="">Choose a screener...</option>
            {screeners?.map((screener) => (
              <option key={screener.id} value={screener.id}>
                {screener.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {selectedIds.length} deal{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          <Button
            onClick={() =>
              bulkScreen({
                dealOpportunityIds: selectedIds,
                screenerId: selectedScreenerId!,
              })
            }
            disabled={isPending || !selectedScreenerId}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding to queue...
              </span>
            ) : (
              "Screen Deals"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Step 2b: Manual Screening - confirm
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => setScreeningType(null)}
      >
        ← Back
      </Button>
      <p className="text-muted-foreground text-sm">
        Screen {selectedIds.length} deal{selectedIds.length === 1 ? "" : "s"}{" "}
        with manual (hard filter) criteria? Jobs will run in the background.
      </p>
      <div className="flex justify-end">
        <Button
          onClick={() => bulkManualScreen({ dealOpportunityIds: selectedIds })}
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding to queue...
            </span>
          ) : (
            "Screen Deals"
          )}
        </Button>
      </div>
    </div>
  );
}
