"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

export function ScreenDealButton({
  dealOpportunityId,
}: {
  dealOpportunityId: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();

  const screeningMutation = useMutation(
    trpc.dealOpportunities.screenOpportunity.mutationOptions({
      onSuccess: () => {
        toast.success("Deterministic screening completed");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to run screening");
      },
    }),
  );

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={screeningMutation.isPending}
      onClick={(event) => {
        event.stopPropagation();
        screeningMutation.mutate({ id: dealOpportunityId });
      }}
    >
      {screeningMutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      <span className="ml-1.5">
        {screeningMutation.isPending ? "Running" : "Run Screening"}
      </span>
    </Button>
  );
}
