import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetAllInvestors } from "@repo/db/queries";
import InvestorContainer from "@/components/InvestorContainer";
import InvestorsDataTableSkeleton from "@/components/skeletons/InvestorsDataTableSkeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import LeadsAuthedSkeleton from "@/components/skeletons/LeadsAuthedSkeleton";

export const metadata: Metadata = {
  title: "Investors",
  description: "View all investors",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(typeof value === "string" ? value : value?.[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const InvestorsPage = (props: { searchParams: SearchParams }) => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Investors</h1>
        <Button asChild size="sm">
          <Link href="/investors/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Investor
          </Link>
        </Button>
      </div>

      <Suspense fallback={<LeadsAuthedSkeleton />}>
        <AuthedInvestors
          searchParams={props.searchParams}
          sessionPromise={sessionPromise}
        />
      </Suspense>
    </section>
  );
};

export default InvestorsPage;

async function AuthedInvestors(props: {
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
    <Suspense fallback={<InvestorsDataTableSkeleton />}>
      <ShowInvestorsComponent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

async function ShowInvestorsComponent(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const searchParams = props.searchParams;
  const currentPage = Math.max(1, asNumber(searchParams.page, 1));
  const limit = Math.max(1, asNumber(searchParams.limit, 25));
  const offset = (currentPage - 1) * limit;

  return (
    <FetchAndDisplayInvestors
      offset={offset}
      limit={limit}
      currentPage={currentPage}
    />
  );
}

async function FetchAndDisplayInvestors({
  offset,
  limit,
  currentPage,
}: {
  offset: number;
  limit: number;
  currentPage: number;
}) {
  "use cache";
  cacheTag("investors");
  cacheLife("hours");

  const { data, totalPages, totalCount } = await GetAllInvestors({
    offset,
    limit,
  });

  return (
    <InvestorContainer
      data={data}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  );
}
