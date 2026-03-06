import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetDealOpportunitiesByStages } from "db/queries";
import { DealsDataTable } from "./data-table";
import { columns } from "./columns";
import DealsAuthedSkeleton from "@/components/skeletons/DealsAuthedSkeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Deals",
  description: "View all deals",
};

const DealsPage = () => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Deals Pipeline</h1>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/deals/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New Deal
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/screenings" className="gap-2">
              <Eye className="h-4 w-4" />
              View Screenings
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
  const data = await GetDealOpportunitiesByStages();

  return <DealsDataTable columns={columns} data={data} />;
}
