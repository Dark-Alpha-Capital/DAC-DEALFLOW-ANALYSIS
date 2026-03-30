import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Palette, Pencil } from "lucide-react";
import { loadInvestmentThemeDetailData } from "@/lib/server/investment-themes-route-data";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeDetailTabs from "@/components/theme-detail/ThemeDetailTabs";

function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "PAUSED":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "RETIRED":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export const Route = createFileRoute("/_protected/investment-themes/$uid/")({
  head: () => ({
    meta: [{ title: "Investment theme — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadInvestmentThemeDetailData({ data: { uid: params.uid } }),
  pendingComponent: ThemePageSkeleton,
  component: ThemeDetailRoute,
});

function ThemePageSkeleton() {
  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="mb-6 h-9 w-32" />
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </section>
  );
}

function ThemeDetailRoute() {
  const { themeWorkspace, companiesResult, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading theme
          </h1>
          <p className="text-muted-foreground text-sm">
            There was an error loading the theme. Please try again later.
          </p>
          {import.meta.env.DEV && (
            <p className="text-muted-foreground text-xs">{error}</p>
          )}
          <Button asChild>
            <Link to="/investment-themes">Back to Investment themes</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!themeWorkspace || !themeWorkspace.theme) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Theme not found
          </h1>
          <p className="text-muted-foreground text-sm">
            The theme you are looking for does not exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/investment-themes">Back to Investment themes</Link>
          </Button>
        </div>
      </section>
    );
  }

  const {
    theme,
    activeThesis,
    thesisHistory,
    activeIndustryIntelligence,
    industryIntelligenceHistory,
    latestPerformance,
    performanceHistory,
    companyCount,
    dealOpportunityCount,
    coverage,
  } = themeWorkspace;
  const companies = companiesResult?.data ?? [];

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 pl-0 transition-all hover:pl-2"
        >
          <Link to="/investment-themes">
            <ArrowLeft className="h-4 w-4" />
            Back to Investment themes
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Badge className={getStatusColor(theme.status)}>
              {theme.status}
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight">
              {theme.name}
            </h1>
            <p className="text-muted-foreground flex items-center gap-1.5">
              <Palette className="h-4 w-4" />
              {theme.sector}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/investment-themes/${theme.id}/edit`} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit Theme
            </Link>
          </Button>
        </div>

        <ThemeDetailTabs
          theme={theme}
          companyCount={companyCount}
          dealOpportunityCount={dealOpportunityCount}
          activeThesis={activeThesis}
          thesisHistory={thesisHistory}
          activeIndustryIntelligence={activeIndustryIntelligence}
          industryIntelligenceHistory={industryIntelligenceHistory}
          latestPerformance={latestPerformance}
          performanceHistory={performanceHistory}
          coverage={coverage}
          companies={companies.map((c) => ({
            id: c.id,
            name: c.name,
            industry: c.industry,
            location: c.location,
          }))}
        />
      </div>
    </section>
  );
}
