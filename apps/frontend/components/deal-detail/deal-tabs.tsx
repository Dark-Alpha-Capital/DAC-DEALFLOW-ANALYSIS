import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Brain,
  FileText,
  Users,
  Plus,
  DollarSign,
  TrendingUp,
  Percent,
  CreditCard,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { Deal, Document, AiScreening, POC } from "db/schema";
import { DealMetricCard } from "./deal-metric-card";
import FetchDealAIScreenings from "@/components/FetchDealAIScreenings";
import FetchDealDocuments from "@/components/fetch-deal-documents";
import FetchDealPOC from "@/components/FetchDealPOC";
import DealDocumentUploadDialog from "@/components/Dialogs/deal-document-upload-dialog";

interface DealTabsProps {
  deal: Deal;
  uid: string;
  documents: Document[];
  aiScreenings: AiScreening[];
  pocs: POC[];
}

export function DealTabs({
  deal,
  uid,
  documents,
  aiScreenings,
  pocs,
}: DealTabsProps) {
  const {
    dealCaption,
    revenue,
    ebitda,
    ebitdaMargin,
    askingPrice,
    grossRevenue,
    firstName,
    lastName,
    workPhone,
    email,
    dealType,
  } = deal;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:inline-flex lg:w-auto">
        <TabsTrigger value="overview" className="gap-2">
          <LayoutDashboard className="hidden h-4 w-4 sm:block" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="ai-analysis" className="gap-2">
          <Brain className="hidden h-4 w-4 sm:block" />
          AI Analysis
        </TabsTrigger>
        <TabsTrigger value="documents" className="gap-2">
          <FileText className="hidden h-4 w-4 sm:block" />
          Documents
        </TabsTrigger>
        <TabsTrigger value="contacts" className="gap-2">
          <Users className="hidden h-4 w-4 sm:block" />
          Contacts
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="mt-6 space-y-6">
        {dealCaption && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Deal Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {dealCaption}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Financial Metrics */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Financial Metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DealMetricCard
              label="Revenue"
              value={revenue}
              format="currency"
              icon={<DollarSign className="h-5 w-5" />}
            />
            <DealMetricCard
              label="EBITDA"
              value={ebitda}
              format="currency"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <DealMetricCard
              label="EBITDA Margin"
              value={ebitdaMargin}
              format="percentage"
              icon={<Percent className="h-5 w-5" />}
            />
            <DealMetricCard
              label="Asking Price"
              value={askingPrice}
              format="currency"
              icon={<CreditCard className="h-5 w-5" />}
            />
            <DealMetricCard
              label="Gross Revenue"
              value={grossRevenue}
              format="currency"
              icon={<DollarSign className="h-5 w-5" />}
            />
          </div>
        </div>

        {/* Contact Information */}
        {(firstName || lastName || workPhone || email) && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(firstName || lastName) && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {[firstName, lastName].filter(Boolean).join(" ") ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                )}
                {workPhone && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{workPhone}</p>
                    </div>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{email}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* AI Analysis Tab */}
      <TabsContent value="ai-analysis" className="mt-6 space-y-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">AI Reasoning</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/raw-deals/${uid}/reasonings`}>View All</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/raw-deals/${uid}/screen`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Analysis
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <FetchDealAIScreenings
                dealId={uid}
                dealType={dealType}
                aiScreenings={aiScreenings}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="mt-6 space-y-6">
        {/* Deal Documents */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Deal Documents</CardTitle>
            <DealDocumentUploadDialog dealId={uid} dealType={dealType} />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <FetchDealDocuments dealId={uid} documents={documents} />
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Contacts Tab */}
      <TabsContent value="contacts" className="mt-6 space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Points of Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <FetchDealPOC dealId={uid} pocs={pocs} />
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
