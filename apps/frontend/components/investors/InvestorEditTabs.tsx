
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EditInvestorForm from "@/components/forms/edit-investor-form";
import { InvestorCompanyLinkSection } from "@/components/investors/InvestorCompanyLinkSection";
import type { InvestorCompanyLinkRow } from "@/components/investors/InvestorCompanyLinkForm";
import type { Investor } from "@repo/db";

type Props = {
  investor: Investor;
  investorId: string;
  companyLinks: InvestorCompanyLinkRow[];
};

export function InvestorEditTabs({
  investor,
  investorId,
  companyLinks,
}: Props) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="company">Linked companies</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-8">
        <EditInvestorForm investor={investor} />
      </TabsContent>
      <TabsContent value="company" className="mt-8">
        <InvestorCompanyLinkSection
          investorId={investorId}
          links={companyLinks}
          className="mt-0"
        />
      </TabsContent>
    </Tabs>
  );
}
