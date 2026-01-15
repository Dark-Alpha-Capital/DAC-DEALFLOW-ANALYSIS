import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealHeader } from "@/components/deal-detail/deal-header";
import { DealTabs } from "@/components/deal-detail/deal-tabs";
import DealPageSkeleton from "@/components/skeletons/deal-page-skeleton";
import { GetDealWithAllRelations } from "db/queries";
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
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">
              Error Loading Deal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              There was an error loading the deal. Please try again later.
            </p>
            {process.env.NODE_ENV === "development" && (
              <p className="text-xs text-muted-foreground">{error.message}</p>
            )}
            <Button asChild>
              <Link href="/raw-deals">Back to Raw Deals</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!dealData || !dealData.deal) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Deal Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The deal you are looking for does not exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/raw-deals">Back to Raw Deals</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-5xl px-4 py-8">
      <DealHeader deal={dealData.deal} uid={uid} />

      <div className="mt-8">
        <DealTabs
          deal={dealData.deal}
          uid={uid}
          documents={dealData.documents}
          aiScreenings={dealData.aiScreenings}
          pocs={dealData.pocs}
        />
      </div>
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
  return (
    <CachedDealContent uid={params.uid} />
  );
}

export default function ManualDealSpecificPage(props: { params: Params }) {
  const sessionPromise = getSession();
  return (
    <Suspense fallback={<DealPageSkeleton />}>
      <AuthedDealContent params={props.params} sessionPromise={sessionPromise} />
    </Suspense>
  );
}
