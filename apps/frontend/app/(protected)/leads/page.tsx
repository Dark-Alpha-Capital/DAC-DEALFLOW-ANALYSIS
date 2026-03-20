import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetAllLeads } from "@repo/db/queries";
import LeadContainer from "@/components/LeadContainer";
import LeadsAuthedSkeleton from "@/components/skeletons/LeadsAuthedSkeleton";
import DocumentsTableSkeleton from "@/components/skeletons/DocumentsTableSkeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Leads",
  description: "View all leads",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(typeof value === "string" ? value : value?.[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const LeadsPage = (props: { searchParams: SearchParams }) => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Leads</h1>
        <Button asChild size="sm">
          <Link href="/leads/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Link>
        </Button>
      </div>

      <Suspense fallback={<LeadsAuthedSkeleton />}>
        <AuthedLeads
          searchParams={props.searchParams}
          sessionPromise={sessionPromise}
        />
      </Suspense>
    </section>
  );
};

export default LeadsPage;

async function AuthedLeads(props: {
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
    <Suspense fallback={<DocumentsTableSkeleton />}>
      <ShowLeadsComponent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

async function ShowLeadsComponent(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const searchParams = props.searchParams;
  const currentPage = Math.max(1, asNumber(searchParams.page, 1));
  const limit = Math.max(1, asNumber(searchParams.limit, 25));
  const offset = (currentPage - 1) * limit;

  return (
    <FetchAndDisplayLeads
      offset={offset}
      limit={limit}
      currentPage={currentPage}
    />
  );
}

async function FetchAndDisplayLeads({
  offset,
  limit,
  currentPage,
}: {
  offset: number;
  limit: number;
  currentPage: number;
}) {
  "use cache";
  cacheTag("leads");
  cacheLife("hours");

  const { data, totalPages, totalCount } = await GetAllLeads({ offset, limit });

  return (
    <LeadContainer
      data={data}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  );
}
