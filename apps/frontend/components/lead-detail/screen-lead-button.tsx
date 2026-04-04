import { useMutation } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

export function ScreenLeadButton({ leadId }: { leadId: string }) {
  const trpc = useTRPC();
  const router = useRouter();

  const screeningMutation = useMutation(
    trpc.leads.screenLead.mutationOptions({
      onSuccess: () => {
        toast.success("Deterministic screening completed");
        void router.invalidate();
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
        screeningMutation.mutate({ leadId });
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
