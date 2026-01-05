import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  CheckSquare,
  MessageSquare,
  Calendar,
  Plus,
} from "lucide-react";
import Link from "next/link";
import db, {
  companies,
  dueDiligenceSections,
  files,
  reviews,
  tasks,
  users,
  eq,
  desc,
  count,
} from "db";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
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

  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);

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

  const [companyData] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!companyData) {
    notFound();
  }

  const sectionsList = await db
    .select()
    .from(dueDiligenceSections)
    .where(eq(dueDiligenceSections.companyId, companyId))
    .orderBy(desc(dueDiligenceSections.createdAt));

  const filesList = await db
    .select()
    .from(files)
    .where(eq(files.companyId, companyId))
    .orderBy(desc(files.createdAt));

  const reviewsData = await db
    .select({
      review: reviews,
      reviewerName: users.name,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.companyId, companyId))
    .orderBy(desc(reviews.createdAt));

  const reviewsList = reviewsData.map((r) => ({
    ...r.review,
    reviewer: { name: r.reviewerName },
  }));

  const tasksData = await db
    .select({
      task: tasks,
      assigneeName: users.name,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedToId, users.id))
    .where(eq(tasks.companyId, companyId))
    .orderBy(desc(tasks.createdAt));

  const tasksList = tasksData.map((t) => ({
    ...t.task,
    assignedTo: { name: t.assigneeName },
  }));

  const [filesCount] = await db
    .select({ count: count() })
    .from(files)
    .where(eq(files.companyId, companyId));
  const [sectionsCount] = await db
    .select({ count: count() })
    .from(dueDiligenceSections)
    .where(eq(dueDiligenceSections.companyId, companyId));
  const [reviewsCount] = await db
    .select({ count: count() })
    .from(reviews)
    .where(eq(reviews.companyId, companyId));
  const [tasksCount] = await db
    .select({ count: count() })
    .from(tasks)
    .where(eq(tasks.companyId, companyId));

  const company = {
    ...companyData,
    sections: sectionsList,
    files: filesList,
    reviews: reviewsList,
    tasks: tasksList,
    _count: {
      files: filesCount?.count ?? 0,
      sections: sectionsCount?.count ?? 0,
      reviews: reviewsCount?.count ?? 0,
      tasks: tasksCount?.count ?? 0,
    },
  };

  const stats = [
    { label: "Files", value: company._count.files, icon: FileText },
    { label: "Sections", value: company._count.sections, icon: CheckSquare },
    { label: "Reviews", value: company._count.reviews, icon: MessageSquare },
    { label: "Tasks", value: company._count.tasks, icon: Calendar },
  ];

  return (
    <>
      <div className="mb-8">
        <Button variant="ghost" asChild size="sm" className="mb-6 -ml-2">
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

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Due Diligence Sections
              </h2>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3 w-3" />
                Add
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
                        <p className="text-xs text-muted-foreground">
                          {section.type}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {section.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Recent Files
              </h2>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3 w-3" />
                Upload
              </Button>
            </div>

            <div className="border border-border">
              {company.files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No files yet
                  </p>
                  <Button size="sm" variant="outline" className="mt-4">
                    <Plus className="mr-1.5 h-3 w-3" />
                    Upload First File
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {company.files.slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{file.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.category}
                        </p>
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
        </div>

        <section className="mt-8">
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
      </div>
    </>
  );
}
