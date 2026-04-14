import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function PullNewDealsFromBitrixButton() {
  const trpc = useTRPC();
  const router = useRouter();

  const syncMutation = useMutation(
    trpc.dealOpportunities.syncDealOpportunitiesFromBitrix.mutationOptions({
      onSuccess: async (data) => {
        toast.success(
          `Pulled ${data.imported} new deal${data.imported === 1 ? "" : "s"} from Bitrix; ${data.skipped} already in app (${data.totalFromBitrix} in pipeline).`,
        );
        void router.invalidate();
      },
      onError: (err) => {
        toast.error(err.message || "Could not pull deals from Bitrix");
      },
    }),
  );

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={syncMutation.isPending}
      onClick={() => syncMutation.mutate()}
      className="gap-2"
      aria-busy={syncMutation.isPending}
      title="Import deals that exist in Bitrix but are not yet in this app (does not refresh existing rows)"
    >
      <RefreshCw
        className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
        aria-hidden
      />
      {syncMutation.isPending ? "Pulling from Bitrix…" : "Pull from Bitrix"}
    </Button>
  );
}
