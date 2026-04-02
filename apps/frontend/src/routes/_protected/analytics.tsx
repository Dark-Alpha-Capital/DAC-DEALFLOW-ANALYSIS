import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const Route = createFileRoute("/_protected/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — Dark Alpha Capital" }],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Institutional dashboards across investment themes, pipeline, sources,
            and AI screenings.
          </p>
        </div>
      </div>

      <AnalyticsDashboard />
    </section>
  );
}
