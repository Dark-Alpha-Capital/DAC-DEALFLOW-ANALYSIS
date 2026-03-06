import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import LeadPageSkeleton from "@/components/skeletons/lead-page-skeleton";
import { GetLeadById } from "db/queries";
import { formatCurrency } from "@/lib/utils";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";

function getStatusColor(status: string): string {
  switch (status) {
    case "NEW":
      return "bg-primary/10 text-primary";
    case "PROCESSED":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "DUPLICATE":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "REJECTED":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

type Params = Promise<{ uid: string }>;

async function CachedLeadContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`lead-${uid}`);
  cacheLife("hours");

  let lead = null;
  let error: Error | null = null;

  try {
    lead = await GetLeadById(uid);
  } catch (err) {
    console.error("Error fetching lead", err);
    error = err instanceof Error ? err : new Error(String(err));
  }

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading lead
          </h1>
          <p className="text-muted-foreground text-sm">
            There was an error loading the lead. Please try again later.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-muted-foreground text-xs">{error.message}</p>
          )}
          <Button asChild>
            <Link href="/leads">Back to Leads</Link>
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
          <p className="text-muted-foreground text-sm">
            The lead you are looking for does not exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/leads">Back to Leads</Link>
          </Button>
        </div>
      </section>
    );
  }

  const {
    rawTitle,
    rawDescription,
    rawIndustry,
    sourceWebsite,
    externalListingId,
    revenue,
    ebitda,
    askingPrice,
    brokerage,
    brokerFirstName,
    brokerLastName,
    brokerEmail,
    brokerPhone,
    normalizedCompanyName,
    companyLocation,
    status,
    createdAt,
  } = lead;
  const brokerName = [brokerFirstName, brokerLastName]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 pl-0 transition-all hover:pl-2"
        >
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Link>
        </Button>

        <div className="space-y-3">
          <Badge className={getStatusColor(status)}>{status}</Badge>
          <h1 className="text-2xl font-semibold tracking-tight">{rawTitle}</h1>
          {(brokerage || companyLocation || rawIndustry) && (
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              {brokerage && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {brokerage}
                </span>
              )}
              {companyLocation && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {companyLocation}
                </span>
              )}
              {rawIndustry && <span>{rawIndustry}</span>}
            </p>
          )}
        </div>

        {rawDescription && (
          <div className="border-border space-y-2 border-b pb-6">
            <h2 className="text-muted-foreground text-sm font-medium">
              Description
            </h2>
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {rawDescription}
            </p>
          </div>
        )}

        {(revenue != null || ebitda != null || askingPrice != null) && (
          <div className="border-border space-y-3 border-b pb-6">
            <h2 className="text-muted-foreground text-sm font-medium">
              Financials
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {revenue != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Revenue</p>
                  <p className="text-foreground font-medium tabular-nums">
                    {formatCurrency(revenue)}
                  </p>
                </div>
              )}
              {ebitda != null && (
                <div>
                  <p className="text-muted-foreground text-xs">EBITDA</p>
                  <p className="text-foreground font-medium tabular-nums">
                    {formatCurrency(ebitda)}
                  </p>
                </div>
              )}
              {askingPrice != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Asking Price</p>
                  <p className="text-foreground font-medium tabular-nums">
                    {formatCurrency(askingPrice)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {(brokerName || brokerEmail || brokerPhone) && (
          <div className="border-border space-y-3 border-b pb-6">
            <h2 className="text-muted-foreground text-sm font-medium">
              Broker / Contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {brokerName && (
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="text-foreground text-sm">{brokerName}</p>
                </div>
              )}
              {brokerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <a
                    href={`mailto:${brokerEmail}`}
                    className="text-primary hover:underline"
                  >
                    {brokerEmail}
                  </a>
                </div>
              )}
              {brokerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <a
                    href={`tel:${brokerPhone}`}
                    className="text-primary hover:underline"
                  >
                    {brokerPhone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/leads/${lead.id}/edit`}>Edit Lead</Link>
          </Button>
          {sourceWebsite && (
            <Button asChild variant="outline" size="sm">
              <a
                href={sourceWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Source
              </a>
            </Button>
          )}
        </div>

        {normalizedCompanyName && (
          <p className="text-muted-foreground text-xs">
            Normalized: {normalizedCompanyName}
            {externalListingId && ` • ID: ${externalListingId}`}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          Added {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </section>
  );
}

async function AuthedLeadContent(props: {
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
  return <CachedLeadContent uid={params.uid} />;
}

export default function LeadDetailPage(props: { params: Params }) {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<LeadPageSkeleton />}>
      <AuthedLeadContent
        params={props.params}
        sessionPromise={sessionPromise}
      />
    </Suspense>
  );
}
