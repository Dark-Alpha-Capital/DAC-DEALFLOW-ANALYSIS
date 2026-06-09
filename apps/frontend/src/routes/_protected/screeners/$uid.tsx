import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import ScreenerEditor from "@/components/screeners/screener-editor";
import { loadScreenerDetailData } from "@/lib/server/screeners-route-data";
import ScreenerPageSkeleton, {
  ScreenerDetailRoutePending,
} from "@/components/skeletons/screener-page-skeleton";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute("/_protected/screeners/$uid")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Screener — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadScreenerDetailData({ data: { uid: params.uid } }),
  pendingComponent: ScreenerDetailRoutePending,
  component: ScreenerDetailRoute,
});

function ScreenerDetailRoute() {
  const { uid } = Route.useParams();
  const { screener } = Route.useLoaderData();

  
  return (
    <section className="block-space-mini big-container">
      <Suspense fallback={<ScreenerPageSkeleton />}>
        <ScreenerEditor screenerId={uid} initialScreener={screener} />
      </Suspense>
    </section>
  );
}
