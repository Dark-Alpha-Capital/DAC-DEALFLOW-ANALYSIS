import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DealHeader } from "@/components/deal-detail/deal-header";
import { DealDetailTabs } from "@/components/deal-detail/DealDetailTabs";
import DealPageSkeleton from "@/components/skeletons/deal-page-skeleton";
import FetchDealAIScreenings from "@/components/FetchDealAIScreenings";
import type { AiScreening } from "@repo/db/schema";
import { GetDealWithAllRelations } from "@repo/db/queries";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";

type Params = Promise<{ uid: string }>;

async function CachedDealContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`deal-${uid}`);
  cacheLife("hours");

  let dealData = null;
  let error: Error | null = null;

  try {
    dealData = await GetDealWithAllRelations(uid);
  } catch (err) {
    console.error("Error fetching deal with all relations", err);
    error = err instanceof Error ? err : new Error(String(err));
  }

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading deal
          </h1>
          <p className="text-muted-foreground text-sm">
            There was an error loading the deal. Please try again later.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-muted-foreground text-xs">{error.message}</p>
          )}
          <Button asChild>
            <Link href="/deals">Back to Deals</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!dealData || !dealData.deal) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Deal not found
          </h1>
          <p className="text-muted-foreground text-sm">
            The deal you are looking for does not exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/deals">Back to Deals</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <DealDetailTabs
        deal={dealData.deal}
        uid={uid}
        company={dealData.company ?? null}
        dealOpportunities={dealData.dealOpportunities ?? []}
        companyContacts={dealData.companyContacts ?? []}
        dealContacts={dealData.dealContacts ?? []}
        outreach={dealData.outreach ?? []}
        companyDocuments={dealData.companyDocuments ?? []}
        dealDocuments={dealData.dealDocuments ?? []}
        aiScreenings={(dealData.aiScreenings ?? []) as unknown as AiScreening[]}
        companyNotes={dealData.companyNotes ?? []}
      />
    </section>
  );
}

async function AuthedDealContent(props: {
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
  return <CachedDealContent uid={params.uid} />;
}

export default function DealDetailPage(props: { params: Params }) {
  const sessionPromise = getSession();

  return (
    <Suspense fallback={<DealPageSkeleton />}>
      <AuthedDealContent
        params={props.params}
        sessionPromise={sessionPromise}
      />
    </Suspense>
  );
}
