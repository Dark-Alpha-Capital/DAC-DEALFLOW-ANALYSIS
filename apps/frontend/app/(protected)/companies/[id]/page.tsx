import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import {
  ExternalLink,
  FileText,
  CheckSquare,
  MessageSquare,
  Calendar,
  Users,
  LayoutDashboard,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import CompanyActions from "@/components/company-actions";
import { BulkFileUploadDialog } from "@/components/Dialogs/bulk-file-upload-dialog";
import { getCompanyById } from "db/queries";
import { getSession } from "@/lib/auth-server";
import { cacheLife, cacheTag } from "next/cache";
import CompanyDetailLoadingSkeleton from "./loading";
import CompanyFilesList from "@/components/company-files-list";

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
  return (
    <section className="big-container block-space-mini group min-h-screen">
      <Suspense fallback={<CompanyDetailLoadingSkeleton />}>
        <ShowCompanyDetailComponent params={params} />
      </Suspense>
    </section>
  );
};

export default CompanyDetailPage;

async function ShowCompanyDetailComponent({
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

  return <FetchAndDisplayCompanyDetailData companyId={resolvedParams.id} />;
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
        <Button variant="ghost" asChild size="sm" className="-ml-2 mb-6">
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
            <BulkFileUploadDialog companyId={company.id} />
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:inline-flex lg:w-auto">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="hidden h-4 w-4 sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="founders" className="gap-2">
              <Users className="hidden h-4 w-4 sm:block" />
              Founders
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FileText className="hidden h-4 w-4 sm:block" />
              Files ({company._count.files})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <MessageSquare className="hidden h-4 w-4 sm:block" />
              Reviews ({company._count.reviews})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <Calendar className="hidden h-4 w-4 sm:block" />
              Tasks ({company._count.tasks})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                <section>
                  <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Company Information
                  </h2>
                  <div className="grid gap-6 border border-border p-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Headquarters
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        Annual Revenue
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {company.revenue
                          ? formatCurrency(Number(company.revenue))
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">EBITDA</p>
                      <p className="mt-1 text-lg font-semibold">
                        {company.ebitda
                          ? formatCurrency(Number(company.ebitda))
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Growth Rate
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {company.growthRate ? `${company.growthRate}%` : "—"}
                      </p>
                    </div>
                  </div>
                </section>
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
              </div>
            </div>
          </TabsContent>

          {/* Founders Tab */}
          <TabsContent value="founders" className="mt-6">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Founders ({company.founders.length})
                </h2>
              </div>
              <div className="border border-border">
                {company.founders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No founders added yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {company.founders.map((founder) => (
                      <div
                        key={founder.id}
                        className="flex items-center justify-between p-4"
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
                )}
              </div>
            </section>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-6">
            <CompanyFilesList
              files={company.files}
              companyId={company.id}
              fileCount={company._count.files}
            />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-6">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Reviews ({company._count.reviews})
                </h2>
              </div>
              <div className="border border-border">
                {company.reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No reviews yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {company.reviews.map((review) => (
                      <div key={review.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {review.title}
                              </p>
                              {review.riskLevel && (
                                <Badge
                                  variant={
                                    review.riskLevel === "HIGH"
                                      ? "destructive"
                                      : review.riskLevel === "MEDIUM"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {review.riskLevel}
                                </Badge>
                              )}
                            </div>
                            {review.content && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {review.content}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                              {review.reviewer?.name && (
                                <span>By {review.reviewer.name}</span>
                              )}
                              {review.confidence && (
                                <span>Confidence: {review.confidence}%</span>
                              )}
                              <span>
                                {new Date(
                                  review.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-6">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Tasks ({company._count.tasks})
                </h2>
              </div>
              <div className="border border-border">
                {company.tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No tasks yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {company.tasks.map((task) => (
                      <div key={task.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {task.title}
                              </p>
                              {task.status && (
                                <Badge
                                  variant={
                                    task.status === "COMPLETED"
                                      ? "default"
                                      : task.status === "IN_PROGRESS"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {task.status.replace("_", " ")}
                                </Badge>
                              )}
                              {task.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {task.priority}
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              {task.assignedTo?.name && (
                                <span>Assigned to {task.assignedTo.name}</span>
                              )}
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due:{" "}
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {task.completedAt && (
                                <span>
                                  Completed:{" "}
                                  {new Date(
                                    task.completedAt,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
