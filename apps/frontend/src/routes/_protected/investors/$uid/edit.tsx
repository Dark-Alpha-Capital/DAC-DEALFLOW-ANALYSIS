import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { loadInvestorForEditData } from "@/lib/server/investors-route-data";
import { InvestorEditTabs } from "@/components/investors/InvestorEditTabs";
import EditPageSkeleton from "@/components/skeletons/edit-page-skeleton";

export const Route = createFileRoute("/_protected/investors/$uid/edit")({
  head: () => ({
    meta: [{ title: "Edit Investor — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadInvestorForEditData({ data: { uid: params.uid } }),
  pendingComponent: EditPageSkeleton,
  component: EditInvestorRoute,
});

function EditInvestorRoute() {
  const { uid } = Route.useParams();
  const { investor, companyLinks, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading investor
          </h1>
          <Button asChild>
            <Link to="/investors">Back to Investors</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!investor) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Investor not found
          </h1>
          <Button asChild>
            <Link to="/investors">Back to Investors</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link to={`/investors/${uid}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Investor
          </Link>
        </Button>
        <h1 className="mt-4">Edit Investor</h1>
        <p className="text-muted-foreground">
          Update profile or manage linked companies.
        </p>
      </div>
      <InvestorEditTabs
        investor={investor}
        investorId={uid}
        companyLinks={companyLinks}
      />
    </section>
  );
}
