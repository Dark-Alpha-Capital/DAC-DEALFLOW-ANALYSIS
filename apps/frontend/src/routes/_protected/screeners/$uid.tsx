import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import ScreenerEditor from "@/components/screeners/screener-editor";
import { loadScreenerDetailData } from "@/lib/server/screeners-route-data";
import ScreenerPageSkeleton from "@/components/skeletons/screener-page-skeleton";

export const Route = createFileRoute("/_protected/screeners/$uid")({
  head: () => ({
    meta: [{ title: "Screener — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadScreenerDetailData({ data: { uid: params.uid } }),
  pendingComponent: () => (
    <section className="block-space big-container">
      <ScreenerPageSkeleton />
    </section>
  ),
  component: ScreenerDetailRoute,
});

function ScreenerDetailRoute() {
  const { uid } = Route.useParams();
  const { screener } = Route.useLoaderData();
  return (
    <section className="block-space big-container">
      <Suspense fallback={<ScreenerPageSkeleton />}>
        <ScreenerEditor screenerId={uid} initialScreener={screener} />
      </Suspense>
    </section>
  );
}
