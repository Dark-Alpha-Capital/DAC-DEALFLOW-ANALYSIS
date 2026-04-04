import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ConvertInvestorLeadToInvestorForm from "@/components/investor-leads/ConvertInvestorLeadToInvestorForm";
import { loadConvertInvestorLeadPageData } from "@/lib/server/investor-leads-route-data";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute("/_protected/investor-leads/$uid/convert")(
  {
    staleTime: ROUTE_DATA_STALE_TIME_MS,
    gcTime: ROUTE_DATA_GC_TIME_MS,
    head: () => ({
      meta: [{ title: "Convert Investor Lead — Dark Alpha Capital" }],
    }),
    loader: async ({ params }) => {
      const result = await loadConvertInvestorLeadPageData({
        data: { uid: params.uid },
      });
      if (result.outcome === "redirect") {
        throw redirect({ to: result.to, replace: result.replace });
      }
      if (result.outcome === "error") {
        return { lead: null, error: result.message };
      }
      if (result.outcome === "empty") {
        return { lead: null, error: null as string | null };
      }
      return { lead: result.lead, error: null };
    },
    pendingComponent: ConvertPageSkeleton,
    component: ConvertInvestorLeadRoute,
  },
);

function ConvertPageSkeleton() {
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

function ConvertInvestorLeadRoute() {
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
    <section className="big-container">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link to={`/investor-leads/${uid}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Investor Lead
          </Link>
        </Button>
        <h1 className="mt-4">Convert Investor Lead to Investor</h1>
        <p className="text-muted-foreground">
          Review and edit the information below before creating the investor.
        </p>
      </div>
      <ConvertInvestorLeadToInvestorForm lead={lead} />
    </section>
  );
}
