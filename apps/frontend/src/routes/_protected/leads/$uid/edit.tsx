import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { loadLeadForEditData } from "@/lib/server/leads-route-data";
import EditLeadForm from "@/components/forms/edit-lead-form";
import { Skeleton } from "@/components/ui/skeleton";
import BackButton from "@/components/Buttons/back-button";

export const Route = createFileRoute("/_protected/leads/$uid/edit")({
  head: () => ({
    meta: [{ title: "Edit Lead — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadLeadForEditData({ data: { uid: params.uid } }),
  pendingComponent: EditPageSkeleton,
  component: EditLeadRoute,
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

function EditLeadRoute() {
  const { lead, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading lead
          </h1>
          <Button asChild>
            <BackButton href="/leads" label="Back to Leads" />
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
            Lead not found
          </h1>
          <Button asChild>
            <Link to="/leads">Back to Leads</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <BackButton label="Go Back" />
        <h1 className="mt-4">Edit Lead</h1>
        <p className="text-muted-foreground">Update lead details.</p>
      </div>
      <EditLeadForm lead={lead} />
    </section>
  );
}
