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
import type { SimScreeningRunForDealRow } from "@repo/db/queries";
import type { CIMAnalysisData } from "./CIMAnalysisSection";
import { ClientOnly } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealHeader } from "./deal-header";
import { DealFinancialsSection } from "./DealFinancialsSection";
import { EntityContactsSection } from "./EntityContactsSection";
import { EntityDocumentsSection } from "./EntityDocumentsSection";
import {
  CompanyOutreach,
  type OutreachRow,
} from "@/components/company-detail/CompanyOutreach";
import { CompanyNotes } from "@/components/company-detail/CompanyNotes";
import FetchDealAIScreenings from "@/components/FetchDealAIScreenings";
import {
  FileText,
  User,
  Info,
  Globe,
  Calendar,
  MapPin,
  Factory,
  CircleUser,
  DollarSign,
} from "lucide-react";
import { DeterministicScreeningSummary } from "./DeterministicScreeningSummary";
import { CIMAnalysisSection } from "./CIMAnalysisSection";
import { DealRelationshipLinksSection } from "./DealRelationshipLinksSection";

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
  /** Resolved from opportunity creator (or legacy deal owner). */
  creatorName?: string | null;
  /** SIM / CIM template runs for sessions scoped to this deal opportunity. */
  simScreeningRunsForDeal?: SimScreeningRunForDealRow[];
  cimAnalysis?: CIMAnalysisData | null;
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
  creatorName = null,
  simScreeningRunsForDeal = [],
  cimAnalysis = null,
}: DealDetailTabsProps) {
  const dealOutreach = outreach.filter((row) => row.dealOpportunityId === uid);
  const hasPipeline = !!currentOpportunity;

  const outreachDealPickerRows = (() => {
    const mapped = dealOpportunities.map((o) => ({
      id: o.id,
      stage: o.stage ?? "LISTED",
      createdAt: o.createdAt ?? new Date(),
    }));
    if (
      currentOpportunity &&
      !mapped.some((r) => r.id === currentOpportunity.id)
    ) {
      return [
        {
          id: currentOpportunity.id,
          stage: currentOpportunity.stage ?? "LISTED",
          createdAt: currentOpportunity.createdAt ?? new Date(),
        },
        ...mapped,
      ];
    }
    return mapped;
  })();

  const brokerSummary =
    deal.brokerage ||
    [deal.firstName, deal.lastName].filter(Boolean).join(" ") ||
    null;

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const initialTab =
    defaultTab === "screenings" ||
    defaultTab === "ai-screening" ||
    defaultTab === "financials" ||
    defaultTab === "sim-analysis" ||
    defaultTab === "linked-entities" ||
    defaultTab === "relationships" ||
    defaultTab === "outreach" ||
    defaultTab === "documents" ||
    defaultTab === "contacts" ||
    defaultTab === "notes"
      ? defaultTab === "ai-screening"
        ? "screenings"
        : defaultTab === "relationships"
          ? "linked-entities"
          : defaultTab
      : "overview";

  return (
    <div className="space-y-6">
      <DealHeader
        deal={deal}
        uid={uid}
        basePath="deal-opportunities"
        currentOpportunity={currentOpportunity}
      />
      <Tabs defaultValue={initialTab} className="w-full space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="screenings">Screenings</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          {hasPipeline && (
            <TabsTrigger value="sim-analysis">SIM Analysis</TabsTrigger>
          )}
          <TabsTrigger value="linked-entities">Linked entities</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Info className="text-muted-foreground h-4 w-4" />
              Overview
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {deal.sourceWebsite ? (
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Globe className="h-3 w-3" />
                    Source
                  </dt>
                  <dd>
                    <a
                      href={
                        deal.sourceWebsite.startsWith("http")
                          ? deal.sourceWebsite
                          : `https://${deal.sourceWebsite}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {deal.sourceWebsite}
                    </a>
                  </dd>
                </div>
              ) : null}
              {deal.createdAt && (
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3 w-3" />
                    Created
                  </dt>
                  <dd>
                    {new Date(deal.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <CircleUser className="h-3 w-3" />
                  Creator
                </dt>
                <dd>{creatorName ?? "—"}</dd>
              </div>
              {brokerSummary && (
                <div>
                  <dt className="text-muted-foreground text-xs">Broker</dt>
                  <dd>{brokerSummary}</dd>
                </div>
              )}
              {deal.companyLocation && (
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <MapPin className="h-3 w-3" />
                    Location
                  </dt>
                  <dd>{deal.companyLocation}</dd>
                </div>
              )}
              {deal.industry ? (
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Factory className="h-3 w-3" />
                    Industry
                  </dt>
                  <dd>{deal.industry}</dd>
                </div>
              ) : null}
              {deal.askingPrice != null && (
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <DollarSign className="h-3 w-3" />
                    Asking price
                  </dt>
                  <dd>{formatMoney(deal.askingPrice)}</dd>
                </div>
              )}
            </dl>
          </div>

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

        <TabsContent value="linked-entities">
          <DealRelationshipLinksSection dealOpportunityId={uid} />
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
              simScreeningRunsForDeal={simScreeningRunsForDeal}
            />
          </section>
        </TabsContent>

        <TabsContent value="financials" className="space-y-8">
          <DealFinancialsSection
            deal={deal}
            currentOpportunity={currentOpportunity ?? undefined}
            financialSnapshots={financialSnapshots}
          />
        </TabsContent>

        {hasPipeline && (
          <TabsContent value="sim-analysis" className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">SIM Analysis</h2>
              <p className="text-muted-foreground text-sm">
                Review extracted CIM/SIM insights in a dedicated workspace.
              </p>
            </div>
            <CIMAnalysisSection
              dealOpportunityId={uid}
              entityName={company?.name ?? deal.dealTeaser ?? "Deal"}
              initialData={cimAnalysis}
            />
          </TabsContent>
        )}

        <TabsContent value="outreach">
          <ClientOnly
            fallback={<div className="bg-muted/30 h-48 rounded-md border" />}
          >
            <CompanyOutreach
              outreach={dealOutreach}
              companyId={company?.id}
              defaultDealOpportunityId={uid}
              dealOpportunities={outreachDealPickerRows}
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
              entityName: company?.name ?? deal.dealTeaser ?? "Deal",
            }}
          />
          {company ? (
            <EntityDocumentsSection
              title="Company documents"
              entityType="COMPANY"
              entityId={company.id}
              documents={companyDocuments}
              emptyMessage="No company documents. Upload to attach to this company."
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Link a company to this deal to manage company-level documents.
            </p>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-8">
          {company ? (
            <EntityContactsSection
              title="Company contacts"
              entityType="COMPANY"
              entityId={company.id}
              contacts={companyContacts}
              emptyLabel="No company contacts added yet."
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Link a company to this deal to manage company contacts.
            </p>
          )}
          <EntityContactsSection
            title="Deal contacts"
            entityType="DEAL_OPPORTUNITY"
            entityId={uid}
            contacts={dealContacts}
            emptyLabel="No deal-specific contacts added yet."
          />
        </TabsContent>

        <TabsContent value="notes">
          <ClientOnly
            fallback={
              <div className="bg-muted/30 min-h-[200px] rounded-md border" />
            }
          >
            {company ? (
              <CompanyNotes
                company={company}
                notes={companyNotes}
                dealUid={uid}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Link a company to this deal to add company notes.
              </p>
            )}
          </ClientOnly>
        </TabsContent>
      </Tabs>
    </div>
  );
}
