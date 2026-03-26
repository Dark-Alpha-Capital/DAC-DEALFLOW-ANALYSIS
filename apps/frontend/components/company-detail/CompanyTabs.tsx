import type { Company, Investor, InvestorCompanyLink } from "@repo/db";
import type {
  DealOpportunity,
  Document,
  Contact,
  CompanyNote,
  CompanyFinancialSnapshot,
} from "@repo/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyOverview } from "./CompanyOverview";
import { CompanyFinancials } from "./CompanyFinancials";
import { CompanyDealsList } from "./CompanyDealsList";
import { CompanyContacts } from "./CompanyContacts";
import { CompanyDocuments } from "./CompanyDocuments";
import { CompanyNotes } from "./CompanyNotes";
import { CompanyOutreach, type OutreachRow } from "./CompanyOutreach";
import { CompanyLinkedInvestors } from "./CompanyLinkedInvestors";

interface CompanyTabsProps {
  company: Company & { themeName?: string | null };
  dealOpportunities: DealOpportunity[];
  documents: Document[];
  contacts: Contact[];
  outreach: OutreachRow[];
  notes: CompanyNote[];
  financialSnapshots: CompanyFinancialSnapshot[];
  linkedInvestors: {
    link: InvestorCompanyLink;
    investor: Investor;
  }[];
}

export function CompanyTabs({
  company,
  dealOpportunities,
  documents,
  contacts,
  outreach,
  notes,
  financialSnapshots,
  linkedInvestors,
}: CompanyTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="financials">Financials</TabsTrigger>
        <TabsTrigger value="deals">Deal opportunities</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="investors">Investors</TabsTrigger>
        <TabsTrigger value="outreach">Outreach</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <CompanyOverview company={company} />
      </TabsContent>

      <TabsContent value="financials">
        <CompanyFinancials
          company={company}
          financialSnapshots={financialSnapshots}
        />
      </TabsContent>

      <TabsContent value="deals">
        <CompanyDealsList
          company={company}
          dealOpportunities={dealOpportunities}
        />
      </TabsContent>

      <TabsContent value="contacts">
        <CompanyContacts company={company} initialContacts={contacts} />
      </TabsContent>

      <TabsContent value="investors">
        <CompanyLinkedInvestors
          companyId={company.id}
          linkedInvestors={linkedInvestors}
        />
      </TabsContent>

      <TabsContent value="outreach">
        <CompanyOutreach
          outreach={outreach}
          companyId={company.id}
          dealOpportunities={dealOpportunities.map((deal) => ({
            id: deal.id,
            stage: deal.stage,
            createdAt: deal.createdAt,
          }))}
        />
      </TabsContent>

      <TabsContent value="documents">
        <CompanyDocuments company={company} documents={documents} />
      </TabsContent>

      <TabsContent value="notes">
        <CompanyNotes company={company} notes={notes} />
      </TabsContent>
    </Tabs>
  );
}
