"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
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
import type { DealStatus, ReviewState } from "@repo/db/schema";

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  SOLD: "Sold",
  UNDER_CONTRACT: "Under Contract",
  NOT_SPECIFIED: "Not Specified",
};

const REVIEW_STATE_LABELS: Record<string, string> = {
  NOT_SEEN: "Not Seen",
  SEEN: "Seen",
  REVIEWED: "Reviewed",
  PUBLISHED: "Published",
};

interface DealStatusControlsProps {
  dealId: string;
  status: DealStatus;
  reviewState: ReviewState;
}

export function DealStatusControls({
  dealId,
  status,
  reviewState,
}: DealStatusControlsProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: updateSpecifications, isPending } = useMutation(
    trpc.dealOpportunities.updateSpecifications.mutationOptions({
      onSuccess: () => {
        toast.success("Deal updated");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update");
      },
    }),
  );

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label className="text-sm">Status</Label>
        <Select
          value={status}
          onValueChange={(value) =>
            updateSpecifications({
              dealId,
              status: value as DealStatus,
              reviewState,
            })
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm">Review State</Label>
        <Select
          value={reviewState}
          onValueChange={(value) =>
            updateSpecifications({
              dealId,
              status,
              reviewState: value as ReviewState,
            })
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(REVIEW_STATE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
