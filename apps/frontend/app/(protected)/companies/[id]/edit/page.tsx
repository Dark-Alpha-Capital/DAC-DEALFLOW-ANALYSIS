import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { getCompanyById } from "db/queries";
import { getSession } from "@/lib/auth-server";
import { cacheLife, cacheTag } from "next/cache";
import { Skeleton } from "@/components/ui/skeleton";

interface EditCompanyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: EditCompanyPageProps): Promise<Metadata> {
  const { id } = await params;

  const company = await getCompanyById(id);

  if (!company) {
    return {
      title: "Company Not Found",
      description: "The company you are looking for does not exist",
    };
  }

  return {
    title: `Edit ${company.name}`,
    description: `Edit company details for ${company.name}`,
  };
}

function EditCompanyLoadingSkeleton() {
  return (
    <section className="big-container block-space-mini min-h-screen">
      <div className="mb-8">
        <Skeleton className="mb-6 h-8 w-16" />
        <div className="border-b border-border pb-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <div className="max-w-3xl space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border p-6">
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const EditCompanyPage = async ({ params }: EditCompanyPageProps) => {
  return (
    <section className="big-container block-space-mini group min-h-screen">
      <Suspense fallback={<EditCompanyLoadingSkeleton />}>
        <ShowEditCompanyComponent params={params} />
      </Suspense>
    </section>
  );
};

export default EditCompanyPage;

async function ShowEditCompanyComponent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [resolvedParams, userSession] = await Promise.all([
    params,
    getSession(),
  ]);

  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return <FetchAndDisplayEditCompanyData companyId={resolvedParams.id} />;
}

async function FetchAndDisplayEditCompanyData({
  companyId,
}: {
  companyId: string;
}) {
  "use cache";
  cacheTag(`company-${companyId}`);
  cacheLife("hours");

  const company = await getCompanyById(companyId);

  if (!company) {
    notFound();
  }

  return (
    <>
      <div className="mb-8">
        <Button variant="ghost" asChild size="sm" className="-ml-2 mb-6">
          <Link href={`/companies/${company.id}`}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Link>
        </Button>

        <div className="border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit Company
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{company.name}</p>
        </div>
      </div>

      <div className="max-w-3xl">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Company Information
            </h2>
            <div className="grid gap-6 border border-border p-6 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">
                  Company Name
                </label>
                <p className="mt-1 text-sm">{company.name}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Website</label>
                <p className="mt-1 text-sm">{company.website || "—"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Sector</label>
                <p className="mt-1 text-sm">{company.sector || "—"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Stage</label>
                <p className="mt-1 text-sm">
                  {company.stage?.replace("_", " ") || "—"}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Headquarters
                </label>
                <p className="mt-1 text-sm">{company.headquarters || "—"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Employees
                </label>
                <p className="mt-1 text-sm">
                  {company.employees?.toLocaleString() || "—"}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Financial Information
            </h2>
            <div className="grid gap-6 border border-border p-6 sm:grid-cols-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  Annual Revenue
                </label>
                <p className="mt-1 text-sm">
                  {company.revenue
                    ? `$${company.revenue.toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">EBITDA</label>
                <p className="mt-1 text-sm">
                  {company.ebitda ? `$${company.ebitda.toLocaleString()}` : "—"}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Growth Rate
                </label>
                <p className="mt-1 text-sm">
                  {company.growthRate ? `${company.growthRate}%` : "—"}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </h2>
            <div className="border border-border p-6">
              <p className="text-sm text-muted-foreground">
                {company.description || "No description provided."}
              </p>
            </div>
          </section>

          <div className="flex flex-col items-center justify-center border border-dashed border-border py-12">
            <Pencil className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Editing Coming Soon</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Company editing functionality is under development
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href={`/companies/${company.id}`}>Back to Company</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
