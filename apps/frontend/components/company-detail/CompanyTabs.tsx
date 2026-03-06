import type { Company } from "@repo/db";
import type { DealOpportunity, Document, Contact } from "@repo/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyOverview } from "./CompanyOverview";
import { CompanyFinancials } from "./CompanyFinancials";
import { CompanyDealsList } from "./CompanyDealsList";
import { CompanyContacts } from "./CompanyContacts";
import { CompanyDocuments } from "./CompanyDocuments";
import { CompanyNotes } from "./CompanyNotes";

interface CompanyTabsProps {
  company: Company & { themeName?: string | null };
  dealOpportunities: DealOpportunity[];
  documents: Document[];
  contacts: Contact[];
}

export function CompanyTabs({
  company,
  dealOpportunities,
  documents,
  contacts,
}: CompanyTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="financials">Financials</TabsTrigger>
        <TabsTrigger value="deals">Deal opportunities</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <CompanyOverview company={company} />
        <CompanyFinancials company={company} />
      </TabsContent>

      <TabsContent value="financials">
        <CompanyFinancials company={company} />
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

      <TabsContent value="documents">
        <CompanyDocuments company={company} documents={documents} />
      </TabsContent>

      <TabsContent value="notes">
        <CompanyNotes company={company} />
      </TabsContent>
    </Tabs>
  );
}
