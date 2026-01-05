import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DealHeader } from "@/components/deal-detail/deal-header";
import { DealTabs } from "@/components/deal-detail/deal-tabs";
import DealPageSkeleton from "@/components/skeletons/deal-page-skeleton";
import { GetDealById } from "db/queries";
import { Deal } from "db/schema";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";

type Params = Promise<{ uid: string }>;

async function DealContent(props: { params: Params }) {
  const { uid } = await props.params;
  const userSession = await getSession();
  if (!userSession?.user) {
    redirect("/auth/login");
  }
  return <CachedDealContent uid={uid} />;
}

async function CachedDealContent({ uid }: { uid: string }) {
  "use cache";
  cacheTag(`deal-${uid}`);
  cacheLife("hours");

  let fetchedDeal: Deal | null = null;

  try {
    fetchedDeal = await GetDealById(uid);
  } catch (err) {
    console.error("Error fetching deal by id", err);
  }

  if (!fetchedDeal) {
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
      <DealHeader deal={fetchedDeal} uid={uid} />

      <div className="mt-8">
        <DealTabs deal={fetchedDeal} uid={uid} />
      </div>
    </section>
  );
}

export default function ManualDealSpecificPage(props: { params: Params }) {
  return (
    <Suspense fallback={<DealPageSkeleton />}>
      <DealContent params={props.params} />
    </Suspense>
  );
}
