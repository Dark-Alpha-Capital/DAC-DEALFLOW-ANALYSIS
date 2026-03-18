import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetRankedDealOpportunities } from "@repo/db/queries";
import DealsAuthedSkeleton from "@/components/skeletons/DealsAuthedSkeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DealsWorkspace } from "./deals-workspace";

export const metadata: Metadata = {
  title: "Deal opportunities",
  description: "View all deal opportunities",
};

const DealsPage = () => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Deal opportunities</h1>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/deal-opportunities/quick-add" className="gap-2">
              Quick add
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/deal-opportunities/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New deal opportunity
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<DealsAuthedSkeleton />}>
        <AuthedDeals sessionPromise={sessionPromise} />
      </Suspense>
    </section>
  );
};

export default DealsPage;

async function AuthedDeals(props: {
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const userSession = await props.sessionPromise;
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return <FetchAndDisplayDeals />;
}

async function FetchAndDisplayDeals() {
  "use cache";
  cacheTag("deals");
  cacheLife("hours");
  const rows = await GetRankedDealOpportunities();
  // Dedupe: one row per opportunity (keep best screening when multiple exist)
  const seen = new Set<string>();
  const deals = rows.filter((r) => {
    if (seen.has(r.opp.id)) return false;
    seen.add(r.opp.id);
    return true;
  });
  return <DealsWorkspace deals={deals} />;
}
