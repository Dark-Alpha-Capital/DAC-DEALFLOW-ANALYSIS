import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CompanyDetailPageSkeleton from "@/components/skeletons/company-detail-page-skeleton";
import { CompanyTabs } from "@/components/company-detail/CompanyTabs";
import { loadCompanyDetailData } from "@/lib/server/company-route-data";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute("/_protected/companies/$uid")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Company — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadCompanyDetailData({ data: { uid: params.uid } }),
  pendingComponent: CompanyDetailPageSkeleton,
  component: CompanyDetailRoute,
});

function CompanyDetailRoute() {
  const { companyData, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading company
          </h1>
          <p className="text-muted-foreground text-sm">
            There was an error loading the company. Please try again later.
          </p>
          {import.meta.env.DEV && (
            <p className="text-muted-foreground text-xs">{error}</p>
          )}
          <Button asChild>
            <Link to="/companies">Back to Companies</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!companyData || !companyData.company) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Company not found
          </h1>
          <p className="text-muted-foreground text-sm">
            The company you are looking for does not exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/companies">Back to Companies</Link>
          </Button>
        </div>
      </section>
    );
  }

  const {
    company,
    dealOpportunities,
    documents,
    contacts,
    outreach,
    notes,
    financialSnapshots,
    linkedInvestors,
  } = companyData;

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 pl-0 transition-all hover:pl-2"
        >
          <Link to="/companies">
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Link>
        </Button>

        <CompanyTabs
          company={company}
          dealOpportunities={dealOpportunities}
          documents={documents}
          contacts={contacts}
          outreach={outreach}
          notes={notes ?? []}
          financialSnapshots={financialSnapshots ?? []}
          linkedInvestors={linkedInvestors ?? []}
        />

        <p className="text-muted-foreground text-xs">
          Added {new Date(company.createdAt).toLocaleDateString()}
        </p>
      </div>
    </section>
  );
}
