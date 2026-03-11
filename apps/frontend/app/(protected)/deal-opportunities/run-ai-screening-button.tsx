"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

export function RunAiScreeningButton({
  dealOpportunityId,
}: {
  dealOpportunityId: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();

  const mutation = useMutation(
    trpc.dealOpportunities.runAiScreening.mutationOptions({
      onSuccess: () => {
        toast.success("AI screening completed");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to run AI screening");
      },
    }),
  );

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={mutation.isPending}
      onClick={(e) => {
        e.stopPropagation();
        mutation.mutate({ dealOpportunityId });
      }}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      <span className="ml-1.5">
        {mutation.isPending ? "Running" : "Run AI Screening"}
      </span>
    </Button>
  );
}
