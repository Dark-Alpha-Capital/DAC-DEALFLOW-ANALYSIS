import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <TabsContent value="overview" className="mt-6 space-y-8">
        {dealCaption && (
          <div className="border-b border-border pb-6">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Deal description
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {dealCaption}
            </p>
          </div>
        )}

        {/* Financial Metrics */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Financial metrics
          </h2>
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="border-b border-border pb-6">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Contact information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(firstName || lastName) && (
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium text-foreground">
                    {[firstName, lastName].filter(Boolean).join(" ") || "N/A"}
                  </p>
                </div>
              )}
              {workPhone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground">
                    {workPhone}
                  </p>
                </div>
              )}
              {email && (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">
                    {email}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </TabsContent>

      {/* AI Analysis Tab */}
      <TabsContent value="ai-analysis" className="mt-6 space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              AI reasoning
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/raw-deals/${uid}/reasonings`}>View all</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/raw-deals/${uid}/screen`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add analysis
                </Link>
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[500px] pr-4">
            <FetchDealAIScreenings
              dealId={uid}
              dealType={dealType}
              aiScreenings={aiScreenings}
            />
          </ScrollArea>
        </div>
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="mt-6 space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Deal documents
            </h2>
            <DealDocumentUploadDialog dealId={uid} dealType={dealType} />
          </div>
          <ScrollArea className="h-[600px] pr-4">
            <FetchDealDocuments dealId={uid} documents={documents} />
          </ScrollArea>
        </div>
      </TabsContent>

      {/* Contacts Tab */}
      <TabsContent value="contacts" className="mt-6 space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6">
          <h2 className="text-sm font-medium text-muted-foreground">
            Points of contact
          </h2>
          <ScrollArea className="h-[400px] pr-4">
            <FetchDealPOC dealId={uid} pocs={pocs} />
          </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  );
}
