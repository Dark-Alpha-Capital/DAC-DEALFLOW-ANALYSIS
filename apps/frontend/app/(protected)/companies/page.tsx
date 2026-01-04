import { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import GetCompanies from "db/queries";
import CompanyList from "@/components/company-list";
import CompaniesLoadingSkeleton from "./loading";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";

export const metadata: Metadata = {
  title: "Companies - Due Diligence",
  description: "Manage companies for due diligence",
};

type SearchParams = Promise<{
  search?: string;
  page?: string;
}>;

const CompaniesPage = async (props: { searchParams: SearchParams }) => {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1>Companies</h1>
          <p>Manage companies for due diligence processes</p>
        </div>
        <Button asChild>
          <Link href="/companies/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Link>
        </Button>
      </div>

      <Suspense fallback={<CompaniesLoadingSkeleton />}>
        <ShowCompaniesComponent searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
};

export default CompaniesPage;

async function ShowCompaniesComponent(props: { searchParams: SearchParams }) {
  const userSession = await getSession();
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  const searchParams = await props.searchParams;
  const search = searchParams?.search || "";
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 12;
  const offset = (currentPage - 1) * limit;

  return (
    <div>
      <FetchAndDisplayCompanies
        search={search}
        offset={offset}
        limit={limit}
        currentPage={currentPage}
      />
    </div>
  );
}

async function FetchAndDisplayCompanies({
  search,
  offset,
  limit,
  currentPage,
}: {
  search: string;
  offset: number;
  limit: number;
  currentPage: number;
}) {
  "use cache";

  cacheTag("companies");
  cacheLife("hours");

  const { companies, totalCount, totalPages } = await GetCompanies({
    search,
    offset,
    limit,
  });

  return (
    <div>
      <div className="group-has-[[data-pending]]:animate-pulse">
        {companies.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-xl text-muted-foreground">
              No companies found matching your criteria.
            </p>
          </div>
        ) : (
          <CompanyList
            companies={companies}
            totalCount={totalCount}
            totalPages={totalPages}
            currentPage={currentPage}
          />
        )}
      </div>
    </div>
  );
}
