import { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import GetCompanies from "@/app/actions/get-companies";
import CompanyList from "@/components/company-list";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Companies - Due Diligence",
  description: "Manage companies for due diligence",
};

interface CompaniesPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function CompaniesPage({
  searchParams,
}: CompaniesPageProps) {
  const params = await searchParams;
  const search = params.search;
  const page = parseInt(params.page || "1");
  const limit = 12;
  const offset = (page - 1) * limit;

  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const { companies, totalCount, totalPages } = await GetCompanies({
    search,
    offset,
    limit,
  });

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

      <Suspense fallback={<div>Loading companies...</div>}>
        <CompanyList
          companies={companies}
          totalCount={totalCount}
          totalPages={totalPages}
          currentPage={page}
        />
      </Suspense>
    </section>
  );
}
