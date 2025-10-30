import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Users,
  FileText,
  CheckSquare,
  MessageSquare,
  Calendar,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import prismaDB from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import CompanyActions from "@/components/company-actions";
import { BulkFileUploadDialog } from "@/components/Dialogs/bulk-file-upload-dialog";
import { getCompanyById } from "@/lib/queries";
import { auth } from "@/auth";

interface CompanyDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: CompanyDetailPageProps): Promise<Metadata> {
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
    title: `${company.name} - Company Details`,
    description: `View details and due diligence information for ${company.name}`,
  };
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { id } = await params;
  const userSession = await auth();

  if (!userSession?.user) {
    redirect("/auth/login");
  }

  const company = await getCompanyById(id);

  if (!company) {
    notFound();
  }

  const formatStage = (stage?: string) => {
    if (!stage) return null;
    const stageColors = {
      STARTUP: "bg-blue-100 text-blue-800",
      GROWTH: "bg-green-100 text-green-800",
      MATURE: "bg-gray-100 text-gray-800",
      TURNAROUND: "bg-yellow-100 text-yellow-800",
      DISTRESSED: "bg-red-100 text-red-800",
    };
    return (
      <Badge
        className={
          stageColors[stage as keyof typeof stageColors] ||
          "bg-gray-100 text-gray-800"
        }
      >
        {stage.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/companies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Link>
        </Button>

        <BulkFileUploadDialog />

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{company.name}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{company.sector}</p>
            <p className="max-w-2xl text-muted-foreground">
              {company.description}
            </p>
            {formatStage(company.stage || "")}
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/companies/${company.id}/due-diligence`}>
                Due Diligence
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/companies/${company.id}/edit`}>Edit Company</Link>
            </Button>
            <CompanyActions companyId={company.id} companyName={company.name} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Headquarters
                  </p>
                  <p>{company.headquarters || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Employees
                  </p>
                  <p>
                    {company.employees
                      ? company.employees.toLocaleString()
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Website
                  </p>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {company.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p>Not specified</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Created
                  </p>
                  <p>{new Date(company.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Annual Revenue
                  </p>
                  <p className="text-lg font-semibold">
                    {company.revenue ? formatCurrency(company.revenue) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    EBITDA
                  </p>
                  <p className="text-lg font-semibold">
                    {company.ebitda ? formatCurrency(company.ebitda) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Growth Rate
                  </p>
                  <p className="text-lg font-semibold">
                    {company.growthRate ? `${company.growthRate}%` : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Founders */}
          {company.founders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Founders ({company.founders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {company.founders.map((founder) => (
                    <div
                      key={founder.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{founder.name}</p>
                        {founder.title && (
                          <p className="text-sm text-muted-foreground">
                            {founder.title}
                          </p>
                        )}
                        {founder.email && (
                          <p className="text-sm text-muted-foreground">
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Due Diligence Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Due Diligence Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Files</span>
                </div>
                <Badge variant="secondary">{company._count.files}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-sm">Sections</span>
                </div>
                <Badge variant="secondary">{company._count.sections}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">Reviews</span>
                </div>
                <Badge variant="secondary">{company._count.reviews}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Tasks</span>
                </div>
                <Badge variant="secondary">{company._count.tasks}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {company.files.slice(0, 3).map((file) => (
                  <div key={file.id} className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{file.title}</span>
                  </div>
                ))}
                {company.files.length === 0 && (
                  <p className="text-muted-foreground">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
