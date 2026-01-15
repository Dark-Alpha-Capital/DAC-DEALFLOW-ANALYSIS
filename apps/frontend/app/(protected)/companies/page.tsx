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
import { cacheTag } from "next/cache";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SearchCompanies,
  SearchSector,
  SearchHeadquarters,
  SearchMinRevenue,
  SearchMaxRevenue,
  SearchMinEbitda,
  SearchMaxEbitda,
  SearchMinEmployees,
  SearchMaxEmployees,
} from "@/components/company-filters";
import DeleteCompanyFiltersButton from "@/components/Buttons/delete-company-filters-button";
import SearchDealsSkeleton from "@/components/skeletons/SearchDealsSkeleton";

export const metadata: Metadata = {
  title: "Companies - Due Diligence",
  description: "Manage companies for due diligence",
};

type SearchParams = Promise<{
  search?: string;
  sector?: string;
  headquarters?: string;
  minRevenue?: string;
  maxRevenue?: string;
  minEbitda?: string;
  maxEbitda?: string;
  minEmployees?: string;
  maxEmployees?: string;
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

      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Refine results by name, sector, location, and financial metrics.
                Most filters update results as you type.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DeleteCompanyFiltersButton />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion
              type="multiple"
              defaultValue={["search", "financials", "details"]}
              className="w-full"
            >
              <AccordionItem value="search">
                <AccordionTrigger>Search</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchCompanies />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchSector />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchHeadquarters />
                    </Suspense>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="financials">
                <AccordionTrigger>Financials</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchMinRevenue />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchMaxRevenue />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchMinEbitda />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchMaxEbitda />
                    </Suspense>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details">
                <AccordionTrigger>Company Details</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchMinEmployees />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchMaxEmployees />
                    </Suspense>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<CompaniesLoadingSkeleton />}>
        <ShowCompaniesComponent searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
};

export default CompaniesPage;

async function ShowCompaniesComponent(props: { searchParams: SearchParams }) {
  // Parallelize session check and searchParams resolution
  const [userSession, searchParams] = await Promise.all([
    getSession(),
    props.searchParams,
  ]);

  if (!userSession?.user) {
    redirect("/auth/login");
  }
  const search = searchParams?.search || "";
  const sector = searchParams?.sector || "";
  const headquarters = searchParams?.headquarters || "";
  const minRevenue = searchParams?.minRevenue || "";
  const maxRevenue = searchParams?.maxRevenue || "";
  const minEbitda = searchParams?.minEbitda || "";
  const maxEbitda = searchParams?.maxEbitda || "";
  const minEmployees = searchParams?.minEmployees || "";
  const maxEmployees = searchParams?.maxEmployees || "";
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 12;
  const offset = (currentPage - 1) * limit;

  return (
    <div>
      <FetchAndDisplayCompanies
        search={search}
        sector={sector}
        headquarters={headquarters}
        minRevenue={minRevenue}
        maxRevenue={maxRevenue}
        minEbitda={minEbitda}
        maxEbitda={maxEbitda}
        minEmployees={minEmployees}
        maxEmployees={maxEmployees}
        offset={offset}
        limit={limit}
        currentPage={currentPage}
      />
    </div>
  );
}

async function FetchAndDisplayCompanies({
  search,
  sector,
  headquarters,
  minRevenue,
  maxRevenue,
  minEbitda,
  maxEbitda,
  minEmployees,
  maxEmployees,
  offset,
  limit,
  currentPage,
}: {
  search: string;
  sector: string;
  headquarters: string;
  minRevenue: string;
  maxRevenue: string;
  minEbitda: string;
  maxEbitda: string;
  minEmployees: string;
  maxEmployees: string;
  offset: number;
  limit: number;
  currentPage: number;
}) {
  "use cache";

  cacheTag("companies");

  const { companies, totalCount, totalPages } = await GetCompanies({
    search: search || undefined,
    sector: sector || undefined,
    headquarters: headquarters || undefined,
    minRevenue: minRevenue || undefined,
    maxRevenue: maxRevenue || undefined,
    minEbitda: minEbitda || undefined,
    maxEbitda: maxEbitda || undefined,
    minEmployees: minEmployees || undefined,
    maxEmployees: maxEmployees || undefined,
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
