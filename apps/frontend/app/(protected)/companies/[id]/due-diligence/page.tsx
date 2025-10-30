import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  FileText,
  CheckSquare,
  MessageSquare,
  Calendar,
  Plus,
} from "lucide-react";
import Link from "next/link";
import prismaDB from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface DueDiligencePageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: DueDiligencePageProps): Promise<Metadata> {
  const { id } = await params;

  const company = await prismaDB.company.findUnique({
    where: { id },
    select: { name: true },
  });

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

export default async function DueDiligencePage({
  params,
}: DueDiligencePageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  const company = await prismaDB.company.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { createdAt: "desc" },
      },
      files: {
        orderBy: { createdAt: "desc" },
      },
      reviews: {
        include: {
          reviewer: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        include: {
          assignedTo: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          files: true,
          sections: true,
          reviews: true,
          tasks: true,
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/companies/${company.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Company
          </Link>
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1>Due Diligence</h1>
            <p className="text-muted-foreground">{company.name}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Overview Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company._count.files}</div>
            <p className="text-xs text-muted-foreground">Documents uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company._count.sections}</div>
            <p className="text-xs text-muted-foreground">
              Due diligence sections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company._count.reviews}</div>
            <p className="text-xs text-muted-foreground">Analyst reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company._count.tasks}</div>
            <p className="text-xs text-muted-foreground">Assigned tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Due Diligence Sections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Due Diligence Sections</CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </div>
            <CardDescription>
              Manage different aspects of due diligence
            </CardDescription>
          </CardHeader>
          <CardContent>
            {company.sections.length === 0 ? (
              <div className="py-8 text-center">
                <CheckSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No sections yet</h3>
                <p className="mb-4 text-muted-foreground">
                  Start by creating due diligence sections for this company
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Section
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {company.sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{section.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {section.type}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {section.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Files */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Files</CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </div>
            <CardDescription>
              Documents and files for due diligence
            </CardDescription>
          </CardHeader>
          <CardContent>
            {company.files.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No files yet</h3>
                <p className="mb-4 text-muted-foreground">
                  Upload documents to start the due diligence process
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload First File
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {company.files.slice(0, 5).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{file.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.category}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="mb-2 text-lg font-semibold">
              Due Diligence Features Coming Soon
            </h3>
            <p className="mb-4 text-muted-foreground">
              We're building comprehensive due diligence tools including file
              management, section tracking, review workflows, and task
              assignments.
            </p>
            <div className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <h4 className="mb-1 font-medium">File Management</h4>
                <p className="text-muted-foreground">
                  Upload and organize documents
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <h4 className="mb-1 font-medium">Section Tracking</h4>
                <p className="text-muted-foreground">
                  Track due diligence progress
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <h4 className="mb-1 font-medium">Review Workflows</h4>
                <p className="text-muted-foreground">
                  Collaborative review process
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <h4 className="mb-1 font-medium">Task Management</h4>
                <p className="text-muted-foreground">Assign and track tasks</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
