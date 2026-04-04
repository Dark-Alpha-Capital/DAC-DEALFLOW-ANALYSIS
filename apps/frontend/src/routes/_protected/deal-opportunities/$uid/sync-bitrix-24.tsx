import { createFileRoute } from "@tanstack/react-router";
import { BitrixSyncForm } from "@/components/deal-opportunities/bitrix-sync-form";
import BitrixSyncPageSkeleton from "@/components/skeletons/bitrix-sync-page-skeleton";
import { loadBitrixSyncPreviewData } from "@/lib/server/deal-opportunities-route-data";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

function DealOpportunityBitrixSyncRoute() {
  const { uid } = Route.useParams();
  const { preview, error } = Route.useLoaderData();
  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <BitrixSyncForm
        dealOpportunityId={uid}
        preview={preview}
        previewError={error}
      />
    </section>
  );
}

export const Route = createFileRoute(
  "/_protected/deal-opportunities/$uid/sync-bitrix-24",
)({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Sync to Bitrix24 — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadBitrixSyncPreviewData({ data: { dealOpportunityId: params.uid } }),
  pendingComponent: BitrixSyncPageSkeleton,
  component: DealOpportunityBitrixSyncRoute,
});
