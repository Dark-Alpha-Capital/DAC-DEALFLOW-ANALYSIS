import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, User, Pencil } from "lucide-react";
import { GetInvestorWithRelations } from "@repo/db/queries";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { Skeleton } from "@/components/ui/skeleton";
import {
  investorTypeLabels,
  investorStatusLabels,
  investorRiskProfileLabels,
} from "../columns";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestorInteractions } from "@/components/investors/InvestorInteractions";

type Params = Promise<{ uid: string }>;

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
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

async function CachedInvestorContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`investor-${uid}`);
  cacheLife("hours");

  let data: Awaited<ReturnType<typeof GetInvestorWithRelations>> | null = null;
  let error: Error | null = null;

  try {
    data = await GetInvestorWithRelations(uid);
  } catch (err) {
    console.error("Error fetching investor", err);
    error = err instanceof Error ? err : new Error(String(err));
  }

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-lg font-medium">Error loading</h1>
          <p className="text-muted-foreground text-sm">
            There was an error loading the investor.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/investors">Back to Investors</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!data || !data.investor) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-lg font-medium">Not found</h1>
          <p className="text-muted-foreground text-sm">
            This investor does not exist or has been removed.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/investors">Back to Investors</Link>
          </Button>
        </div>
      </section>
    );
  }

  const { investor, interactions } = data;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/investors"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Investors
        </Link>
        <Button asChild size="sm" variant="ghost" className="shrink-0">
          <Link href={`/investors/${investor.id}/edit`} className="gap-2">
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
                Added {new Date(investor.createdAt).toLocaleDateString()}
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

function InvestorPageSkeleton() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Skeleton className="mb-8 h-5 w-28" />
      <div className="space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </section>
  );
}

async function AuthedInvestorContent(props: {
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
  return <CachedInvestorContent uid={params.uid} />;
}

export default function InvestorDetailPage(props: { params: Params }) {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<InvestorPageSkeleton />}>
      <AuthedInvestorContent
        params={props.params}
        sessionPromise={sessionPromise}
      />
    </Suspense>
  );
}
