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
    <section className="big-container block-space-mini min-h-screen">
      <header className="mb-8 flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage companies for due diligence
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/companies/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Company
          </Link>
        </Button>
      </header>

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
    <div className="group-has-[[data-pending]]:animate-pulse">
      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No companies found
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/companies/new">Add your first company</Link>
          </Button>
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
  );
}
