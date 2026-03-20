import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetAllInvestorLeads } from "@repo/db/queries";
import InvestorLeadContainer from "@/components/InvestorLeadContainer";
import InvestorLeadsAuthedSkeleton from "@/components/skeletons/InvestorLeadsAuthedSkeleton";
import LeadCardGridSkeleton from "@/components/skeletons/LeadCardGridSkeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import LeadsAuthedSkeleton from "@/components/skeletons/LeadsAuthedSkeleton";

export const metadata: Metadata = {
  title: "Investor Leads",
  description: "View all investor leads",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(typeof value === "string" ? value : value?.[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const InvestorLeadsPage = (props: { searchParams: SearchParams }) => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Investor Leads</h1>
        <Button asChild size="sm">
          <Link href="/investor-leads/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Investor Lead
          </Link>
        </Button>
      </div>

      <Suspense fallback={<InvestorLeadsAuthedSkeleton />}>
        <AuthedInvestorLeads
          searchParams={props.searchParams}
          sessionPromise={sessionPromise}
        />
      </Suspense>
    </section>
  );
};

export default InvestorLeadsPage;

async function AuthedInvestorLeads(props: {
  searchParams: SearchParams;
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const [resolvedSearchParams, userSession] = await Promise.all([
    props.searchParams,
    props.sessionPromise,
  ]);
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return (
    <Suspense fallback={<LeadsAuthedSkeleton />}>
      <ShowInvestorLeadsComponent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

async function ShowInvestorLeadsComponent(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const searchParams = props.searchParams;
  const currentPage = Math.max(1, asNumber(searchParams.page, 1));
  const limit = Math.max(1, asNumber(searchParams.limit, 50));
  const offset = (currentPage - 1) * limit;

  return (
    <FetchAndDisplayInvestorLeads
      offset={offset}
      limit={limit}
      currentPage={currentPage}
    />
  );
}

async function FetchAndDisplayInvestorLeads({
  offset,
  limit,
  currentPage,
}: {
  offset: number;
  limit: number;
  currentPage: number;
}) {
  "use cache";
  cacheTag("investor-leads");
  cacheLife("hours");

  const { data, totalPages, totalCount } = await GetAllInvestorLeads({
    offset,
    limit,
  });

  return (
    <InvestorLeadContainer
      data={data}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  );
}
