import { createFileRoute, Link } from "@tanstack/react-router";
import EditDealForm from "@/components/forms/edit-deal-form";
import { loadDealOpportunityForEditData } from "@/lib/server/deal-opportunities-route-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute(
  "/_protected/deal-opportunities/$uid/edit",
)({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Edit deal opportunity — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadDealOpportunityForEditData({ data: { uid: params.uid } }),
  pendingComponent: EditPageSkeleton,
  component: EditDealOpportunityRoute,
});

function EditPageSkeleton() {
  return (
    <section className="big-container block-space min-h-screen">
      <Skeleton className="mb-6 h-9 w-32" />
      <Skeleton className="mb-4 h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </section>
  );
}

function EditDealOpportunityRoute() {
  const { uid } = Route.useParams();
  const { opp, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading deal opportunity
          </h1>
          <Button asChild>
            <Link to="/deal-opportunities">
              Back to deal opportunity opportunities
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!opp) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Deal opportunity not found
          </h1>
          <Button asChild>
            <Link to="/deal-opportunities">
              Back to deal opportunity opportunities
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link to={`/deal-opportunities/${uid}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to deal opportunity
          </Link>
        </Button>
        <h1 className="mt-4">Edit deal opportunity</h1>
        <p className="text-muted-foreground">Update deal opportunity details.</p>
      </div>
      <EditDealForm opp={opp} />
    </section>
  );
}
