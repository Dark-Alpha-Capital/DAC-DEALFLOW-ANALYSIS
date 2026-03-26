"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EditInvestorForm from "@/components/forms/edit-investor-form";
import { InvestorCompanyLinkSection } from "@/components/investors/InvestorCompanyLinkSection";
import type { Company, Investor, InvestorCompanyLink } from "@repo/db";

type Initial = {
  link: InvestorCompanyLink;
  company: Company;
} | null;

type Props = {
  investor: Investor;
  investorId: string;
  initialCompanyLink: Initial;
};

export function InvestorEditTabs({
  investor,
  investorId,
  initialCompanyLink,
}: Props) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="company">Company link</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-8">
        <EditInvestorForm investor={investor} />
      </TabsContent>
      <TabsContent value="company" className="mt-8">
        <InvestorCompanyLinkSection
          investorId={investorId}
          initial={initialCompanyLink}
        />
      </TabsContent>
    </Tabs>
  );
}
