import type { Deal, Company } from "@repo/db";
import type {
  DealOpportunity,
  Document,
  Contact,
  AiScreening,
  CompanyNote,
} from "@repo/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealHeader } from "./deal-header";
import { DealOpportunitiesTable } from "./DealOpportunitiesTable";
import { EntityContactsSection } from "./EntityContactsSection";
import { EntityDocumentsSection } from "./EntityDocumentsSection";
import {
  CompanyOutreach,
  type OutreachRow,
} from "@/components/company-detail/CompanyOutreach";
import { CompanyNotes } from "@/components/company-detail/CompanyNotes";
import FetchDealAIScreenings from "@/components/FetchDealAIScreenings";

interface DealDetailTabsProps {
  deal: Deal & { id: string };
  uid: string;
  company: Company | null;
  dealOpportunities: DealOpportunity[];
  companyContacts: Contact[];
  dealContacts: Contact[];
  outreach: OutreachRow[];
  companyDocuments: Document[];
  dealDocuments: Document[];
  aiScreenings: AiScreening[];
  companyNotes: CompanyNote[];
}

export function DealDetailTabs({
  deal,
  uid,
  company,
  dealOpportunities,
  companyContacts,
  dealContacts,
  outreach,
  companyDocuments,
  dealDocuments,
  aiScreenings,
  companyNotes,
}: DealDetailTabsProps) {
  if (!company) return null;

  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="ai-screening">AI screening</TabsTrigger>
        <TabsTrigger value="deals">Deal opportunities</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="outreach">Outreach</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <DealHeader deal={deal} uid={uid} basePath="deals" />
      </TabsContent>

      <TabsContent value="ai-screening">
        <FetchDealAIScreenings
          dealId={uid}
          dealType={deal.dealType}
          aiScreenings={aiScreenings}
        />
      </TabsContent>

      <TabsContent value="deals">
        <DealOpportunitiesTable
          dealOpportunities={dealOpportunities}
          company={company}
          currentOppId={uid}
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

      <TabsContent value="outreach">
        <CompanyOutreach outreach={outreach} />
      </TabsContent>

      <TabsContent value="documents" className="space-y-8">
        <EntityDocumentsSection
          title="Company documents"
          entityType="COMPANY"
          entityId={company.id}
          documents={companyDocuments}
          emptyMessage="No company documents. Upload to attach to this company."
        />
        <EntityDocumentsSection
          title="Deal documents"
          entityType="DEAL_OPPORTUNITY"
          entityId={uid}
          documents={dealDocuments}
          emptyMessage="No deal documents. Upload to attach to this deal."
        />
      </TabsContent>

      <TabsContent value="notes">
        <CompanyNotes
          company={company}
          notes={companyNotes}
          dealUid={uid}
        />
      </TabsContent>
    </Tabs>
  );
}
