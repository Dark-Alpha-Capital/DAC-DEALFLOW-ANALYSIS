import { createFileRoute, Link } from "@tanstack/react-router";
import DealPageSkeleton from "@/components/skeletons/deal-page-skeleton";
import { loadDealOpportunityDetailData } from "@/lib/server/deal-opportunities-route-data";
import { Button } from "@/components/ui/button";
import { DealDetailTabs } from "@/components/deal-detail/DealDetailTabs";
import type { AiScreening } from "@repo/db/schema";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute("/_protected/deal-opportunities/$uid/")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Deal opportunity — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadDealOpportunityDetailData({ data: { uid: params.uid } }),
  pendingComponent: DealPageSkeleton,
  component: DealOpportunityDetailRoute,
});

function DealOpportunityDetailRoute() {
  const { uid } = Route.useParams();
  const { dealData, error } = Route.useLoaderData();
  return (
    <DealOpportunityDetailView uid={uid} dealData={dealData} error={error} />
  );
}

type DealOppDetailLoader = Awaited<
  ReturnType<typeof loadDealOpportunityDetailData>
>;

function DealOpportunityDetailView(props: {
  uid: string;
  dealData: DealOppDetailLoader["dealData"];
  error: string | null;
}) {
  const { uid, dealData, error } = props;

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading deal opportunity
          </h1>
          <p className="text-muted-foreground text-sm">
            There was an error loading the deal. Please try again later.
          </p>
          {import.meta.env.DEV && (
            <p className="text-muted-foreground text-xs">{error}</p>
          )}
          <Button asChild>
            <Link to="/deal-opportunities">Back to Deal opportunities</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!dealData?.deal) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Deal opportunity not found
          </h1>
          <p className="text-muted-foreground text-sm">
            The deal opportunity you are looking for does not exist or has been
            removed.
          </p>
          <Button asChild>
            <Link to="/deal-opportunities">Back to Deal opportunities</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <DealDetailTabs
        deal={dealData.deal}
        uid={uid}
        company={dealData.company ?? null}
        currentOpportunity={
          "currentOpportunity" in dealData
            ? dealData.currentOpportunity
            : undefined
        }
        dealOpportunities={dealData.dealOpportunities ?? []}
        companyContacts={dealData.companyContacts ?? []}
        dealContacts={dealData.dealContacts ?? []}
        outreach={dealData.outreach ?? []}
        companyDocuments={dealData.companyDocuments ?? []}
        dealDocuments={dealData.dealDocuments ?? []}
        aiScreenings={(dealData.aiScreenings ?? []) as unknown as AiScreening[]}
        deterministicScreening={dealData.deterministicScreening ?? null}
        companyNotes={dealData.companyNotes ?? []}
        financialSnapshots={dealData.financialSnapshots ?? []}
      />
    </section>
  );
}
