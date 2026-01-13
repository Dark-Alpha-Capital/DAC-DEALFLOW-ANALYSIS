import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  CheckSquare,
  MessageSquare,
  Calendar,
  Plus,
  LayoutDashboard,
  Clock,
  Bot,
} from "lucide-react";
import Link from "next/link";
import { getCompanyDueDiligenceData } from "db/queries";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { BulkFileUploadDialog } from "@/components/Dialogs/bulk-file-upload-dialog";
import { CompanyDueDiligenceAI } from "@/components/company-due-diligence-ai";
import DueDiligenceLoadingSkeleton from "./loading";

interface DueDiligencePageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: DueDiligencePageProps): Promise<Metadata> {
  const { id } = await params;

  const company = await getCompanyDueDiligenceData(id);

  if (!company) {
    return {
      title: "Company Not Found",
      description: "The company you are looking for does not exist",
    };
  }

  return {
    title: `${company.name} - Due Diligence`,
    description: `Due diligence process for ${company.name}`,
  };
}

const DueDiligencePage = async ({ params }: DueDiligencePageProps) => {
  const { id } = await params;

  return (
    <section className="big-container block-space-mini group min-h-screen">
      <Suspense fallback={<DueDiligenceLoadingSkeleton />}>
        <ShowDueDiligenceComponent companyId={id} />
      </Suspense>
    </section>
  );
};

export default DueDiligencePage;

async function ShowDueDiligenceComponent({ companyId }: { companyId: string }) {
  const userSession = await getSession();
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return <FetchAndDisplayDueDiligenceData companyId={companyId} />;
}

async function FetchAndDisplayDueDiligenceData({
  companyId,
}: {
  companyId: string;
}) {
  "use cache";
  cacheTag(`company-${companyId}`);
  cacheTag("due-diligence");
  cacheLife("hours");

  const company = await getCompanyDueDiligenceData(companyId);

  if (!company) {
    notFound();
  }

  const stats = [
    { label: "Files", value: company._count.files, icon: FileText },
    { label: "Sections", value: company._count.sections, icon: CheckSquare },
    { label: "Reviews", value: company._count.reviews, icon: MessageSquare },
    { label: "Tasks", value: company._count.tasks, icon: Calendar },
  ];

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
            Due Diligence
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{company.name}</p>
        </div>
      </div>

      <div className="group-has-[[data-pending]]:animate-pulse">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:inline-flex lg:w-auto">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="hidden h-4 w-4 sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="gap-2">
              <Bot className="hidden h-4 w-4 sm:block" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-2">
              <CheckSquare className="hidden h-4 w-4 sm:block" />
              Sections ({company._count.sections})
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="border border-border p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {stat.label}
                    </span>
                    <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>

            <section>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Features
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: "File Management",
                    desc: "Upload and organize documents",
                  },
                  {
                    title: "Section Tracking",
                    desc: "Track due diligence progress",
                  },
                  {
                    title: "Review Workflows",
                    desc: "Collaborative review process",
                  },
                  { title: "Task Management", desc: "Assign and track tasks" },
                ].map((feature) => (
                  <div key={feature.title} className="border border-border p-4">
                    <p className="text-sm font-medium">{feature.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="ai-assistant" className="mt-6">
            <div className="h-[600px]">
              <CompanyDueDiligenceAI companyId={company.id} />
            </div>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="mt-6">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Due Diligence Sections ({company._count.sections})
                </h2>
                <Button size="sm" variant="outline">
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Section
                </Button>
              </div>
              <div className="border border-border">
                {company.sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CheckSquare className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No sections yet
                    </p>
                    <Button size="sm" variant="outline" className="mt-4">
                      <Plus className="mr-1.5 h-3 w-3" />
                      Create First Section
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {company.sections.map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div>
                          <p className="text-sm font-medium">{section.title}</p>
                          {section.type && (
                            <p className="text-xs text-muted-foreground">
                              {section.type}
                            </p>
                          )}
                        </div>
                        {section.status && (
                          <Badge
                            variant={
                              section.status === "DONE"
                                ? "default"
                                : section.status === "IN_REVIEW"
                                  ? "secondary"
                                  : section.status === "BLOCKED"
                                    ? "destructive"
                                    : "outline"
                            }
                            className="text-xs"
                          >
                            {section.status.replace("_", " ")}
                          </Badge>
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
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Files ({company._count.files})
                </h2>
                <BulkFileUploadDialog companyId={company.id} />
              </div>
              <div className="border border-border">
                {company.files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No files uploaded yet
                    </p>
                    <BulkFileUploadDialog companyId={company.id} />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {company.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.title}</p>
                            {file.category && (
                              <p className="text-xs text-muted-foreground">
                                {file.category}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
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
