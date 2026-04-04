import type { ComponentType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Tag, FileText, Pencil } from "lucide-react";
import type { InvestorInteraction } from "@repo/db";
import { loadInvestorLeadDetailData } from "@/lib/server/investor-leads-route-data";
import InvestorLeadDetailPageSkeleton from "@/components/skeletons/investor-lead-detail-page-skeleton";
import { investorLeadStatusLabels } from "@/components/investor-leads/columns";
import { InvestorLeadInteractions } from "@/components/investor-leads/InvestorLeadInteractions";
import { DeleteInvestorLeadButton } from "@/components/investor-leads/DeleteInvestorLeadButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute("/_protected/investor-leads/$uid/")({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Investor lead — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadInvestorLeadDetailData({ data: { uid: params.uid } }),
  pendingComponent: InvestorLeadDetailPageSkeleton,
  component: InvestorLeadDetailRoute,
});

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: ComponentType<{ className?: string }>;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </span>
        <p className="mt-0.5 truncate text-sm">{value}</p>
      </div>
    </div>
  );
}

function InvestorLeadDetailRoute() {
  const { data, existingInvestor, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-lg font-medium">Error loading</h1>
          <p className="text-muted-foreground text-sm">
            There was an error loading the investor lead.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/investor-leads">Back to Investor Leads</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!data || !data.lead) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-lg font-medium">Not found</h1>
          <p className="text-muted-foreground text-sm">
            This investor lead does not exist or has been removed.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/investor-leads">Back to Investor Leads</Link>
          </Button>
        </div>
      </section>
    );
  }

  const { lead, interactions } = data;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          to="/investor-leads"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Investor Leads
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="shrink-0">
            <Link to={`/investor-leads/${lead.id}/edit`} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          {existingInvestor ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled
                title="Lead already converted to investor"
              >
                Convert to Investor
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/investors/${existingInvestor.id}`}>
                  View Investor
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to={`/investor-leads/${lead.id}/convert`}>
                Convert to Investor
              </Link>
            </Button>
          )}
          <DeleteInvestorLeadButton lead={lead} />
        </div>
      </div>

      <header className="mb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {lead.name || "Unnamed lead"}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground text-xs">
                Added {new Date(lead.createdAt).toLocaleDateString()}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                {investorLeadStatusLabels[lead.status] ?? lead.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {lead.email ? (
              <Button asChild variant="outline" size="sm">
                <a href={`mailto:${lead.email}`} className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              </Button>
            ) : null}
            {lead.phone ? (
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${lead.phone}`} className="gap-2">
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
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <section className="lg:col-span-4">
              <div className="space-y-8">
                <div className="space-y-3">
                  <h2 className="text-sm font-medium tracking-tight">
                    Details
                  </h2>
                  <div className="space-y-1">
                    <InfoRow
                      label="Source"
                      value={lead.source ?? undefined}
                      icon={Tag}
                    />
                    <InfoRow
                      label="Email"
                      value={lead.email ?? undefined}
                      icon={Mail}
                    />
                    <InfoRow
                      label="Phone"
                      value={lead.phone ?? undefined}
                      icon={Phone}
                    />
                    <InfoRow
                      label="Inferred type"
                      value={lead.inferredType ?? undefined}
                      icon={Tag}
                    />
                    {!lead.source &&
                    !lead.email &&
                    !lead.phone &&
                    !lead.inferredType ? (
                      <p className="text-muted-foreground pt-2 text-sm">
                        No details yet.
                      </p>
                    ) : null}
                  </div>
                </div>

                {lead.notes ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="text-muted-foreground h-4 w-4" />
                      <h2 className="text-sm font-medium tracking-tight">
                        Notes
                      </h2>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {lead.notes}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="lg:col-span-8">
              <div className="space-y-3">
                <h2 className="text-sm font-medium tracking-tight">
                  Latest activity
                </h2>
                <p className="text-muted-foreground text-sm">
                  Use the Interactions tab to log touchpoints.
                </p>
                <div className="border-border/60 border-l pl-4">
                  {interactions.slice(0, 3).length ? (
                    <ul className="space-y-3">
                      {interactions
                        .slice(0, 3)
                        .map((i: InvestorInteraction) => (
                          <li key={i.id} className="space-y-1">
                            <p className="text-sm">
                              {i.notes ?? i.outcome ?? "Interaction"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {new Date(i.createdAt).toLocaleDateString()}
                            </p>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No activity yet.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="interactions" className="mt-8">
          <InvestorLeadInteractions
            investorLeadId={lead.id}
            initialInteractions={interactions}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
