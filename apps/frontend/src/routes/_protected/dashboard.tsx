import { createFileRoute } from "@tanstack/react-router";
import { GlobalDashboard } from "@/components/dashboard/GlobalDashboard";
import { loadDashboardRouteData } from "@/lib/server/dashboard-route-data";

export const Route = createFileRoute("/_protected/dashboard")({
  head: () => ({
    meta: [{ title: "Global Dashboard — Dark Alpha Capital" }],
  }),
  loader: async () => loadDashboardRouteData(),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { pipeline, themesData, topDeals } = Route.useLoaderData();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Global Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pipeline, lead flow, investment theme coverage, and top-ranked deals
            by deterministic screening score.
          </p>
        </div>
      </div>
      <GlobalDashboard
        pipeline={pipeline}
        themes={themesData}
        topDeals={topDeals}
      />
    </section>
  );
}
