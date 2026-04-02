import type { Deal, Company } from "@repo/db";
import type {
  DealOpportunity,
  Document,
  Contact,
  AiScreening,
  CompanyNote,
  DealOpportunityScreening,
  DealFinancialSnapshot,
} from "@repo/db/schema";
import { ClientOnly } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealHeader } from "./deal-header";
import { DealFinancialsSection } from "./DealFinancialsSection";
import { DealPipelineSection } from "./DealPipelineSection";
import { EntityContactsSection } from "./EntityContactsSection";
import { EntityDocumentsSection } from "./EntityDocumentsSection";
import {
  CompanyOutreach,
  type OutreachRow,
} from "@/components/company-detail/CompanyOutreach";
import { CompanyNotes } from "@/components/company-detail/CompanyNotes";
import FetchDealAIScreenings from "@/components/FetchDealAIScreenings";
import { FileText, User } from "lucide-react";
import { DeterministicScreeningSummary } from "./DeterministicScreeningSummary";
import { CIMAnalysisSection } from "./CIMAnalysisSection";

interface DealDetailTabsProps {
  deal: Deal & { id: string };
  uid: string;
  defaultTab?: string;
  company: Company | null;
  currentOpportunity?: DealOpportunity | null;
  dealOpportunities: DealOpportunity[];
  companyContacts: Contact[];
  dealContacts: Contact[];
  outreach: OutreachRow[];
  companyDocuments: Document[];
  dealDocuments: Document[];
  aiScreenings: AiScreening[];
  deterministicScreening: DealOpportunityScreening | null;
  companyNotes: CompanyNote[];
  financialSnapshots?: DealFinancialSnapshot[];
}

export function DealDetailTabs({
  deal,
  uid,
  defaultTab,
  company,
  currentOpportunity,
  dealOpportunities,
  companyContacts,
  dealContacts,
  outreach,
  companyDocuments,
  dealDocuments,
  aiScreenings,
  deterministicScreening,
  companyNotes,
  financialSnapshots = [],
}: DealDetailTabsProps) {
  if (!company) return null;

  const dealOutreach = outreach.filter((row) => row.dealOpportunityId === uid);
  const hasPipeline = !!currentOpportunity;

  const initialTab =
    defaultTab === "screenings" ||
    defaultTab === "ai-screening" ||
    defaultTab === "financials" ||
    defaultTab === "pipeline" ||
    defaultTab === "outreach" ||
    defaultTab === "documents" ||
    defaultTab === "contacts" ||
    defaultTab === "notes"
      ? defaultTab === "ai-screening"
        ? "screenings"
        : defaultTab
      : "overview";

  return (
    <div className="space-y-6">
      <DealHeader
        deal={deal}
        uid={uid}
        basePath="deal-opportunities"
        stage={currentOpportunity?.stage}
        currentOpportunity={currentOpportunity}
      />
      <Tabs defaultValue={initialTab} className="w-full space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="screenings">Screenings</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          {hasPipeline && <TabsTrigger value="pipeline">Pipeline</TabsTrigger>}
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {(deal.dealTeaser || deal.description) && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <FileText className="text-muted-foreground h-4 w-4" />
                Description
              </h2>
              {deal.dealTeaser && (
                <p className="text-foreground text-sm leading-relaxed">
                  {deal.dealTeaser}
                </p>
              )}
              {deal.description && (
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                  {deal.description}
                </p>
              )}
            </div>
          )}

          {(deal.firstName ||
            deal.lastName ||
            deal.email ||
            deal.workPhone ||
            deal.linkedinUrl ||
            deal.brokerage) && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <User className="text-muted-foreground h-4 w-4" />
                Broker Information
              </h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {(deal.firstName || deal.lastName) && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Name</dt>
                    <dd>
                      {[deal.firstName, deal.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </dd>
                  </div>
                )}
                {deal.brokerage && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Brokerage</dt>
                    <dd>{deal.brokerage}</dd>
                  </div>
                )}
                {deal.email && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${deal.email}`}
                        className="text-primary hover:underline"
                      >
                        {deal.email}
                      </a>
                    </dd>
                  </div>
                )}
                {deal.workPhone && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Phone</dt>
                    <dd>
                      <a
                        href={`tel:${deal.workPhone}`}
                        className="text-primary hover:underline"
                      >
                        {deal.workPhone}
                      </a>
                    </dd>
                  </div>
                )}
                {deal.linkedinUrl && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs">LinkedIn</dt>
                    <dd>
                      <a
                        href={
                          deal.linkedinUrl.startsWith("http")
                            ? deal.linkedinUrl
                            : `https://${deal.linkedinUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {deal.linkedinUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </TabsContent>

        <TabsContent value="screenings" className="flex flex-col gap-8">
          <section className="w-full">
            <DeterministicScreeningSummary
              screening={deterministicScreening}
              dealOpportunityId={uid}
            />
          </section>
          <section className="w-full space-y-3">
            <h2 className="text-base font-semibold">AI Screening</h2>
            <FetchDealAIScreenings
              dealId={uid}
              dealType={deal.dealType}
              aiScreenings={aiScreenings}
            />
          </section>
        </TabsContent>

        <TabsContent value="financials" className="space-y-8">
          <DealFinancialsSection
            deal={deal}
            currentOpportunity={currentOpportunity ?? undefined}
            financialSnapshots={financialSnapshots}
          />
          {hasPipeline && (
            <CIMAnalysisSection
              dealOpportunityId={uid}
              entityName={company?.name ?? "Deal"}
            />
          )}
        </TabsContent>

        {hasPipeline && (
          <TabsContent value="pipeline">
            <DealPipelineSection
              dealId={uid}
              currentOpportunity={currentOpportunity}
            />
          </TabsContent>
        )}

        <TabsContent value="outreach">
          <ClientOnly fallback={<div className="h-48 rounded-md border bg-muted/30" />}>
            <CompanyOutreach
              outreach={dealOutreach}
              companyId={company.id}
              dealOpportunities={dealOpportunities.map((o) => ({
                id: o.id,
                stage: o.stage ?? "LISTED",
                createdAt: o.createdAt ?? new Date(),
              }))}
            />
          </ClientOnly>
        </TabsContent>

        <TabsContent value="documents" className="space-y-8">
          <EntityDocumentsSection
            title="Deal documents"
            entityType="DEAL_OPPORTUNITY"
            entityId={uid}
            documents={dealDocuments}
            emptyMessage="No deal documents. Upload CIM, Teaser, or Financials."
            cimUploadProps={{
              dealOpportunityId: uid,
              entityName: company?.name ?? "Deal",
            }}
          />
          <EntityDocumentsSection
            title="Company documents"
            entityType="COMPANY"
            entityId={company.id}
            documents={companyDocuments}
            emptyMessage="No company documents. Upload to attach to this company."
          />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-8">
          <EntityContactsSection
            title="Company contacts"
            entityType="COMPANY"
            entityId={company.id}
            contacts={companyContacts}
            emptyLabel="No company contacts added yet."
          />
          <EntityContactsSection
            title="Deal contacts"
            entityType="DEAL_OPPORTUNITY"
            entityId={uid}
            contacts={dealContacts}
            emptyLabel="No deal-specific contacts added yet."
          />
        </TabsContent>

        <TabsContent value="notes">
          <ClientOnly fallback={<div className="min-h-[200px] rounded-md border bg-muted/30" />}>
            <CompanyNotes company={company} notes={companyNotes} dealUid={uid} />
          </ClientOnly>
        </TabsContent>
      </Tabs>
    </div>
  );
}
