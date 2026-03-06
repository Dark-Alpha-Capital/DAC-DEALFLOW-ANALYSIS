import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Palette, Pencil } from "lucide-react";
import { GetThemeWithAnalytics, GetCompaniesByThemeId } from "db/queries";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeAnalytics from "@/components/ThemeAnalytics";
import ThemeCompaniesList from "@/components/ThemeCompaniesList";

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

type Params = Promise<{ uid: string }>;

async function CachedThemeContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`theme-${uid}`);
  cacheLife("hours");

  let themeWithAnalytics:
    | Awaited<ReturnType<typeof GetThemeWithAnalytics>>
    | null = null;
  let companiesResult:
    | Awaited<ReturnType<typeof GetCompaniesByThemeId>>
    | null = null;
  let error: Error | null = null;

  try {
    themeWithAnalytics = await GetThemeWithAnalytics(uid);
    if (themeWithAnalytics) {
      companiesResult = await GetCompaniesByThemeId({
        themeId: uid,
        offset: 0,
        limit: 50,
      });
    }
  } catch (err) {
    console.error("Error fetching theme", err);
    error = err instanceof Error ? err : new Error(String(err));
  }

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
          {process.env.NODE_ENV === "development" && (
            <p className="text-muted-foreground text-xs">{error.message}</p>
          )}
          <Button asChild>
            <Link href="/themes">Back to Themes</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!themeWithAnalytics || !themeWithAnalytics.theme) {
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
            <Link href="/themes">Back to Themes</Link>
          </Button>
        </div>
      </section>
    );
  }

  const { theme, industryIntelligence, performance, companyCount, dealOpportunityCount } =
    themeWithAnalytics;
  const companies = companiesResult?.data ?? [];

  const {
    name,
    description,
    sector,
    status,
    capitalPriorityScore,
    confidenceScore,
    createdAt,
  } = theme;

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 pl-0 transition-all hover:pl-2"
        >
          <Link href="/themes">
            <ArrowLeft className="h-4 w-4" />
            Back to Themes
          </Link>
        </Button>

        <div className="space-y-3">
          <Badge className={getStatusColor(status)}>{status}</Badge>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Palette className="h-4 w-4" />
            {sector}
          </p>
        </div>

        <div className="border-border space-y-2 border-b pb-6">
          <h2 className="text-muted-foreground text-sm font-medium">
            Description
          </h2>
          <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {(capitalPriorityScore != null || confidenceScore != null) && (
          <div className="border-border space-y-3 border-b pb-6">
            <h2 className="text-muted-foreground text-sm font-medium">
              Scores
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {capitalPriorityScore != null && (
                <div>
                  <p className="text-muted-foreground text-xs">
                    Capital Priority Score
                  </p>
                  <p className="text-foreground font-medium tabular-nums">
                    {capitalPriorityScore}
                  </p>
                </div>
              )}
              {confidenceScore != null && (
                <div>
                  <p className="text-muted-foreground text-xs">
                    Confidence Score
                  </p>
                  <p className="text-foreground font-medium tabular-nums">
                    {confidenceScore}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <ThemeAnalytics
          companyCount={companyCount}
          dealOpportunityCount={dealOpportunityCount}
          industryIntelligence={
            industryIntelligence && {
              tam: industryIntelligence.tam,
              growthRate: industryIntelligence.growthRate,
              avgEbitdaMargin: industryIntelligence.avgEbitdaMargin,
              avgEntryMultiple: industryIntelligence.avgEntryMultiple,
              avgExitMultiple: industryIntelligence.avgExitMultiple,
              fragmentationScore: industryIntelligence.fragmentationScore,
              sponsorPenetration: industryIntelligence.sponsorPenetration,
              cyclicalityScore: industryIntelligence.cyclicalityScore,
              disruptionRiskScore: industryIntelligence.disruptionRiskScore,
            }
          }
          performance={
            performance && {
              dealsSourced: performance.dealsSourced,
              meetingsHeld: performance.meetingsHeld,
              loisIssued: performance.loisIssued,
              dealsClosed: performance.dealsClosed,
              averageEntryMultiple: performance.averageEntryMultiple,
              averageIRR: performance.averageIRR,
            }
          }
        />

        {companies.length > 0 && (
          <div className="border-border space-y-3 border-b pb-6">
            <h2 className="text-muted-foreground text-sm font-medium">
              Companies in theme
            </h2>
            <ThemeCompaniesList
              companies={companies.map((c) => ({
                id: c.id,
                name: c.name,
                industry: c.industry,
                location: c.location,
              }))}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/themes/${theme.id}/edit`} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit Theme
            </Link>
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Created {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </section>
  );
}

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

async function AuthedThemeContent(props: {
  params: Params;
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const [params, userSession] = await Promise.all([
    props.params,
    props.sessionPromise,
  ]);
  if (!userSession?.user) {
    redirect("/auth/login");
  }
  return <CachedThemeContent uid={params.uid} />;
}

export default function ThemeDetailPage(props: { params: Params }) {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<ThemePageSkeleton />}>
      <AuthedThemeContent
        params={props.params}
        sessionPromise={sessionPromise}
      />
    </Suspense>
  );
}
