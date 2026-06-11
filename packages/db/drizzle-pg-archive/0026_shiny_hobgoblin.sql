DROP INDEX "investor_company_link_investor_unique_idx";--> statement-breakpoint
DROP INDEX "investor_company_link_company_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "investor_company_link_investor_company_unique_idx" ON "InvestorCompanyLink" USING btree ("investorId","companyId");