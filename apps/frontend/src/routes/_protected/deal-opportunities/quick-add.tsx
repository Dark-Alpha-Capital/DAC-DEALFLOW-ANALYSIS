import { createFileRoute } from "@tanstack/react-router";
import { QuickAddDealForm } from "@/components/forms/quick-add-deal-form";
import { loadThemesForSelectData } from "@/lib/server/deal-opportunities-route-data";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import BackButton from "@/components/Buttons/back-button";

export const Route = createFileRoute(
  "/_protected/deal-opportunities/quick-add",
)({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Quick add deal — Dark Alpha Capital" }],
  }),
  loader: async () => loadThemesForSelectData(),
  component: QuickAddDealRoute,
});

function QuickAddDealRoute() {
  const { themes } = Route.useLoaderData();
  return (
    <section className="big-container">
      <div>
        <BackButton label="Back" />
      </div>
      <div className="mt-4 mb-6 md:mt-6">
        <h1 className="text-3xl font-semibold md:text-4xl">Quick add deal</h1>
        <p className="text-muted-foreground">
          Create a deal opportunity only. Companies and investors can be linked
          separately from the deal detail page.
        </p>
      </div>

      <div className="">
        <QuickAddDealForm themes={themes} />
      </div>
    </section>
  );
}
