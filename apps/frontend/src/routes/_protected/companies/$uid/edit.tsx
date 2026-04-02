import { createFileRoute, Link } from "@tanstack/react-router";
import EditCompanyForm from "@/components/forms/edit-company-form";
import { loadCompanyForEditData } from "@/lib/server/company-route-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_protected/companies/$uid/edit")({
  head: () => ({
    meta: [{ title: "Edit Company — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadCompanyForEditData({ data: { uid: params.uid } }),
  pendingComponent: EditPageSkeleton,
  component: EditCompanyRoute,
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

function EditCompanyRoute() {
  const { uid } = Route.useParams();
  const { company, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading company
          </h1>
          <Button asChild>
            <Link to="/companies">Back to Companies</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!company) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Company not found
          </h1>
          <Button asChild>
            <Link to="/companies">Back to Companies</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link to={`/companies/${uid}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Company
          </Link>
        </Button>
        <h1 className="mt-4">Edit Company</h1>
        <p className="text-muted-foreground">Update company details.</p>
      </div>
      <EditCompanyForm company={company} />
    </section>
  );
}
