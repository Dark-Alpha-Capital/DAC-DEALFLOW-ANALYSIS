import { createFileRoute } from "@tanstack/react-router";
import { CimScreeningBitrixSyncForm } from "@/components/deal-opportunities/cim-screening-bitrix-sync-form";
import BitrixSyncPageSkeleton from "@/components/skeletons/bitrix-sync-page-skeleton";
import { loadCimScreeningBitrixSyncData } from "@/lib/server/cim-screening-route-data";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

function CimScreeningBitrixSyncRoute() {
  const { sessionId } = Route.useParams();
  const { runId } = Route.useSearch();
  const { preview, dealOpportunityId, screeningComment, runSummary, error } =
    Route.useLoaderData();

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Sync screening run to Bitrix24
      </h1>

      <CimScreeningBitrixSyncForm
        dealOpportunityId={dealOpportunityId ?? ""}
        sessionId={sessionId}
        runId={runId ?? ""}
        preview={preview}
        previewError={error}
        screeningComment={screeningComment}
        questionCount={runSummary?.questionCount ?? 0}
      />
    </section>
  );
}

export const Route = createFileRoute(
  "/_protected/screening/$sessionId/sync-bitrix-24/",
)({
  validateSearch: (search: Record<string, unknown>) => ({
    runId:
      typeof search.runId === "string"
        ? search.runId
        : Array.isArray(search.runId)
          ? String(search.runId[0] ?? "")
          : undefined,
  }),
  loaderDeps: ({ search }) => ({ runId: search.runId }),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Sync screening run to Bitrix24 — Dark Alpha Capital" }],
  }),
  loader: async ({ params, deps }) =>
    loadCimScreeningBitrixSyncData({
      data: { sessionId: params.sessionId, runId: deps.runId },
    }),
  pendingComponent: BitrixSyncPageSkeleton,
  component: CimScreeningBitrixSyncRoute,
});
