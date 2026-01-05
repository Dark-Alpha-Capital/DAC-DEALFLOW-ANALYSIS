import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  CheckSquare,
  MessageSquare,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import CompanyActions from "@/components/company-actions";
import { BulkFileUploadDialog } from "@/components/Dialogs/bulk-file-upload-dialog";
import { getCompanyById } from "db/queries";
import { getSession } from "@/lib/auth-server";
import { cacheLife, cacheTag } from "next/cache";
import CompanyDetailLoadingSkeleton from "./loading";

interface CompanyDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: CompanyDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  const company = await getCompanyById(id);

  if (!company) {
    notFound();
  }

  return {
    title: `${company.name} - Company Details`,
    description: `View details and due diligence information for ${company.name}`,
  };
}

const CompanyDetailPage = async ({ params }: CompanyDetailPageProps) => {
  const { id } = await params;

  return (
    <section className="big-container block-space-mini group min-h-screen">
      <Suspense fallback={<CompanyDetailLoadingSkeleton />}>
        <ShowCompanyDetailComponent companyId={id} />
      </Suspense>
    </section>
  );
};

export default CompanyDetailPage;

async function ShowCompanyDetailComponent({
  companyId,
}: {
  companyId: string;
}) {
  const userSession = await getSession();
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return <FetchAndDisplayCompanyDetailData companyId={companyId} />;
}

async function FetchAndDisplayCompanyDetailData({
  companyId,
}: {
  companyId: string;
}) {
  "use cache";
  cacheTag(`company-${companyId}`);
  cacheTag("companies");
  cacheLife("hours");

  const company = await getCompanyById(companyId);

  if (!company) {
    notFound();
  }

  return (
    <>
      <div className="mb-8">
        <Button variant="ghost" asChild size="sm" className="mb-6 -ml-2">
          <Link href="/companies">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Link>
        </Button>

        <div className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {company.name}
              </h1>
              {company.stage && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {company.stage.replace("_", " ")}
                </Badge>
              )}
            </div>
            {company.sector && (
              <p className="mt-1 text-sm text-muted-foreground">
                {company.sector}
              </p>
            )}
            {company.description && (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                {company.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <BulkFileUploadDialog />
            <Button asChild variant="outline" size="sm">
              <Link href={`/companies/${company.id}/due-diligence`}>
                Due Diligence
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/companies/${company.id}/edit`}>Edit</Link>
            </Button>
            <CompanyActions companyId={company.id} companyName={company.name} />
          </div>
        </div>
      </div>

      <div className="group-has-[[data-pending]]:animate-pulse">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Company Information
              </h2>
              <div className="grid gap-6 border border-border p-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Headquarters</p>
                  <p className="mt-1 text-sm">
                    {company.headquarters || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="mt-1 text-sm">
                    {company.employees
                      ? company.employees.toLocaleString()
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {company.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="mt-1 text-sm">Not specified</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm">
                    {new Date(company.createdAt).toLocaleDateString()}
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
                  <p className="text-xs text-muted-foreground">Annual Revenue</p>
                  <p className="mt-1 text-lg font-semibold">
                    {company.revenue ? formatCurrency(company.revenue) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">EBITDA</p>
                  <p className="mt-1 text-lg font-semibold">
                    {company.ebitda ? formatCurrency(company.ebitda) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Growth Rate</p>
                  <p className="mt-1 text-lg font-semibold">
                    {company.growthRate ? `${company.growthRate}%` : "—"}
                  </p>
                </div>
              </div>
            </section>

            {company.founders.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Founders ({company.founders.length})
                </h2>
                <div className="space-y-3">
                  {company.founders.map((founder) => (
                    <div
                      key={founder.id}
                      className="flex items-center justify-between border border-border p-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{founder.name}</p>
                        {founder.title && (
                          <p className="text-xs text-muted-foreground">
                            {founder.title}
                          </p>
                        )}
                        {founder.email && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {founder.email}
                          </p>
                        )}
                      </div>
                      {founder.linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={founder.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            LinkedIn
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Due Diligence Overview
              </h2>
              <div className="space-y-3 border border-border p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Files</span>
                  </div>
                  <span className="text-sm font-medium">
                    {company._count.files}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Sections</span>
                  </div>
                  <span className="text-sm font-medium">
                    {company._count.sections}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Reviews</span>
                  </div>
                  <span className="text-sm font-medium">
                    {company._count.reviews}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Tasks</span>
                  </div>
                  <span className="text-sm font-medium">
                    {company._count.tasks}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Recent Activity
              </h2>
              <div className="border border-border p-5">
                {company.files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                ) : (
                  <div className="space-y-3">
                    {company.files.slice(0, 5).map((file) => (
                      <div key={file.id} className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate text-sm">{file.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
