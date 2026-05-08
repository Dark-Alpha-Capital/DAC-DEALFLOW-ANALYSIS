import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { loadInvestorLeadForEditData } from "@/lib/server/investor-leads-route-data";
import EditInvestorLeadForm from "@/components/forms/edit-investor-lead-form";
import EditPageSkeleton from "@/components/skeletons/edit-page-skeleton";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute("/_protected/investor-leads/$uid/edit")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Edit Investor Lead — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadInvestorLeadForEditData({ data: { uid: params.uid } }),
  pendingComponent: EditPageSkeleton,
  component: EditInvestorLeadRoute,
});

function EditInvestorLeadRoute() {
  const { uid } = Route.useParams();
  const { lead, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading investor lead
          </h1>
          <Button asChild>
            <Link to="/investor-leads">Back to Investor Leads</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!lead) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Investor lead not found
          </h1>
          <Button asChild>
            <Link to="/investor-leads">Back to Investor Leads</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link to="/investor-leads/$uid" params={{ uid }}>
            <ArrowLeft className="h-4 w-4" />
            Back to Investor Lead
          </Link>
        </Button>
        <h1 className="mt-4">Edit Investor Lead</h1>
        <p className="text-muted-foreground">Update investor lead details.</p>
      </div>
      <EditInvestorLeadForm lead={lead} />
    </section>
  );
}
