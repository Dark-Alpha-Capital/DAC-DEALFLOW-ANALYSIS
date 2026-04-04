import { createFileRoute } from "@tanstack/react-router";
import ScreeningScoreCard from "@/components/ScreeningScoreCard";
import ScreeningsPageSkeleton from "@/components/skeletons/screenings-page-skeleton";
import { loadScreeningsPageData } from "@/lib/server/screenings-route-data";
import ScreenerResultsList from "@/components/ScreenerResultsList";

export const Route = createFileRoute("/_protected/screenings")({
  head: () => ({
    meta: [{ title: "Screening Overview — Dark Alpha Capital" }],
  }),
  loader: async () => loadScreeningsPageData(),
  pendingComponent: ScreeningsPageSkeleton,
  component: ScreeningsRoute,
});

function ScreeningsRoute() {
  const { items } = Route.useLoaderData();
  return (
    <section className="block-space-mini container">
      <div className="mb-6">
        <h1 className="text-3xl font-bold md:text-4xl">Screening Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          AI analysis across all screened deal opportunities.
        </p>
      </div>

      <div className="space-y-4">
        <ScreeningScoreCard items={items} />
        <ScreenerResultsList items={items} />
      </div>
    </section>
  );
}
