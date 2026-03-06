import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetAllCompanies } from "db/queries";
import CompanyContainer from "@/components/CompanyContainer";
import CompaniesAuthedSkeleton from "@/components/skeletons/CompaniesAuthedSkeleton";
import CompanyCardGridSkeleton from "@/components/skeletons/CompanyCardGridSkeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Companies",
  description: "View all companies",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(typeof value === "string" ? value : value?.[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const CompaniesPage = (props: { searchParams: SearchParams }) => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Companies</h1>
        <Button asChild size="sm">
          <Link href="/companies/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Company
          </Link>
        </Button>
      </div>

      <Suspense fallback={<CompaniesAuthedSkeleton />}>
        <AuthedCompanies
          searchParams={props.searchParams}
          sessionPromise={sessionPromise}
        />
      </Suspense>
    </section>
  );
};

export default CompaniesPage;

async function AuthedCompanies(props: {
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
    <Suspense fallback={<CompanyCardGridSkeleton />}>
      <ShowCompaniesComponent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

async function ShowCompaniesComponent(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const searchParams = props.searchParams;
  const currentPage = Math.max(1, asNumber(searchParams.page, 1));
  const limit = Math.max(1, asNumber(searchParams.limit, 50));
  const offset = (currentPage - 1) * limit;

  return (
    <FetchAndDisplayCompanies
      offset={offset}
      limit={limit}
      currentPage={currentPage}
    />
  );
}

async function FetchAndDisplayCompanies({
  offset,
  limit,
  currentPage,
}: {
  offset: number;
  limit: number;
  currentPage: number;
}) {
  "use cache";
  cacheTag("companies");
  cacheLife("hours");

  const { data, totalPages, totalCount } = await GetAllCompanies({
    offset,
    limit,
  });

  return (
    <CompanyContainer
      data={data}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  );
}
