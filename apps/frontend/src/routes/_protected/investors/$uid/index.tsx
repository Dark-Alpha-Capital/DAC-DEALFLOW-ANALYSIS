import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, User, Pencil } from "lucide-react";
import { loadInvestorDetailData } from "@/lib/server/investors-route-data";
import InvestorDetailPageSkeleton from "@/components/skeletons/investor-detail-page-skeleton";
import {
  investorTypeLabels,
  investorStatusLabels,
  investorRiskProfileLabels,
} from "@/components/investors/columns";
import { formatCurrency, formatDateStable } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestorInteractions } from "@/components/investors/InvestorInteractions";
import { InvestorCompanyLinkTab } from "@/components/investors/InvestorCompanyLinkTab";
import { InvestorLinkedDealOpportunities } from "@/components/investors/InvestorLinkedDealOpportunities";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/routing/route-loader-cache";
import {
  DetailPageError,
  DetailPageNotFound,
  InfoRow,
} from "@/components/entity-detail/detail-page-state";

export const Route = createFileRoute("/_protected/investors/$uid/")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Investor — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadInvestorDetailData({ data: { uid: params.uid } }),
  pendingComponent: InvestorDetailPageSkeleton,
  component: InvestorDetailRoute,
});

function InvestorDetailRoute() {
  const { data, error } = Route.useLoaderData();

  if (error) {
    return (
      <DetailPageError
        title="Error loading"
        message="There was an error loading the investor."
        backTo="/investors"
        backLabel="Back to Investors"
      />
    );
  }

  if (!data || !data.investor) {
    return (
      <DetailPageNotFound
        message="This investor does not exist or has been removed."
        backTo="/investors"
        backLabel="Back to Investors"
      />
    );
  }

  const { investor, interactions, linkedCompanies, linkedDealOpportunities } = data;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          to="/investors"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Investors
        </Link>
        <Button asChild size="sm" variant="ghost" className="shrink-0">
          <Link to="/investors/$uid/edit" params={{ uid: investor.id }} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>
      <header className="mb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {investor.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground text-xs">
                Added {formatDateStable(investor.createdAt)}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                {investorTypeLabels[investor.type] ?? investor.type}
              </span>
              <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                {investorStatusLabels[investor.status] ?? investor.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {investor.email ? (
              <Button asChild variant="outline" size="sm">
                <a href={`mailto:${investor.email}`} className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              </Button>
            ) : null}
            {investor.phone ? (
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${investor.phone}`} className="gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="capital">Capital</TabsTrigger>
            <TabsTrigger value="linked-entities">Linked entities</TabsTrigger>
            <TabsTrigger value="company">Companies</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-8">
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-sm font-medium tracking-tight">Summary</h2>
              <div className="space-y-1">
                <InfoRow
                  label="Primary contact"
                  value={investor.primaryContactName ?? undefined}
                  icon={User}
                />
                <InfoRow
                  label="Email"
                  value={investor.email ?? undefined}
                  icon={Mail}
                />
                <InfoRow
                  label="Phone"
                  value={investor.phone ?? undefined}
                  icon={Phone}
                />
                <InfoRow
                  label="Geography"
                  value={investor.geography ?? undefined}
                  icon={MapPin}
                />
                {!investor.primaryContactName &&
                !investor.email &&
                !investor.phone &&
                !investor.geography ? (
                  <p className="text-muted-foreground py-2 text-sm">
                    No contact details yet.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="capital" className="mt-8">
          <div className="space-y-3">
            <h2 className="text-sm font-medium tracking-tight">
              Capital profile
            </h2>
            <div className="space-y-1">
              <InfoRow
                label="Min check size"
                value={
                  investor.minCheckSize != null
                    ? formatCurrency(Number(investor.minCheckSize))
                    : undefined
                }
              />
              <InfoRow
                label="Max check size"
                value={
                  investor.maxCheckSize != null
                    ? formatCurrency(Number(investor.maxCheckSize))
                    : undefined
                }
              />
              <InfoRow
                label="Sector focus"
                value={investor.sectorFocus?.join(", ")}
              />
              <InfoRow
                label="Stage preference"
                value={investor.stagePreference?.join(", ")}
              />
              <InfoRow
                label="Risk profile"
                value={
                  investor.riskProfile
                    ? (investorRiskProfileLabels[investor.riskProfile] ??
                      investor.riskProfile.replace(/_/g, " "))
                    : undefined
                }
              />
              {!investor.minCheckSize &&
              !investor.maxCheckSize &&
              !investor.sectorFocus?.length &&
              !investor.stagePreference?.length &&
              !investor.riskProfile ? (
                <p className="text-muted-foreground py-2 text-sm">
                  No capital details yet.
                </p>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="linked-entities" className="mt-8">
          <InvestorLinkedDealOpportunities
            investorName={investor.name}
            dealOpportunities={linkedDealOpportunities ?? []}
          />
        </TabsContent>

        <TabsContent value="company" className="mt-8">
          <InvestorCompanyLinkTab
            investorId={investor.id}
            links={linkedCompanies}
          />
        </TabsContent>

        <TabsContent value="interactions" className="mt-8">
          <InvestorInteractions
            investorId={investor.id}
            initialInteractions={interactions}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
