import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, ExternalLink } from "lucide-react";
import LeadPageSkeleton from "@/components/skeletons/lead-page-skeleton";
import {
  GetLeadById,
  GetCompanyByFirstSeenFromLeadId,
  GetCompanyById,
} from "@repo/db/queries";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { LeadDetailTabs } from "@/components/lead-detail/LeadDetailTabs";
import { getLeadStatusClassName } from "@/lib/lead-status";
import LeadStatusControl from "@/components/lead-detail/LeadStatusControl";
import BackButton from "@/components/Buttons/back-button";

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
          <BackButton label="Go Back" />
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
          <BackButton label="Go Back" />
        </div>
      </section>
    );
  }

  const [convertedCompany, duplicateCompany] = await Promise.all([
    GetCompanyByFirstSeenFromLeadId(lead.id),
    lead.duplicateCompanyId
      ? GetCompanyById(lead.duplicateCompanyId)
      : Promise.resolve(null),
  ]);

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-6">
        <BackButton label="Go Back" />

        <div className="space-y-3">
          <Badge className={getLeadStatusClassName(lead.status)}>
            {lead.status}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lead.rawTitle}
          </h1>
          {(lead.brokerage || lead.companyLocation || lead.rawIndustry) && (
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              {lead.brokerage && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {lead.brokerage}
                </span>
              )}
              {lead.companyLocation && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {lead.companyLocation}
                </span>
              )}
              {lead.rawIndustry && <span>{lead.rawIndustry}</span>}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href={`/leads/${lead.id}/edit`}>Edit Lead</Link>
          </Button>
          {convertedCompany ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Lead already converted to company"
              >
                Convert to company
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/companies/${convertedCompany.id}`}>
                  View company
                </Link>
              </Button>
            </>
          ) : duplicateCompany ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Clear duplicate before converting this lead."
              >
                Convert to company
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/companies/${duplicateCompany.id}`}>
                  View duplicate company
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href={`/leads/${lead.id}/convert`}>Convert to company</Link>
            </Button>
          )}
          {lead.sourceWebsite && (
            <Button asChild variant="outline" size="sm">
              <a
                href={lead.sourceWebsite}
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

        <LeadStatusControl
          leadId={lead.id}
          leadStatus={lead.status}
          hasConvertedCompany={!!convertedCompany}
          duplicateCompany={
            duplicateCompany
              ? { id: duplicateCompany.id, name: duplicateCompany.name }
              : null
          }
        />

        <LeadDetailTabs lead={lead} />
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
