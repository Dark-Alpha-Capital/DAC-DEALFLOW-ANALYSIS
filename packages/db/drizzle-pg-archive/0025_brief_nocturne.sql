CREATE TYPE "public"."InvestorCompanyLinkStatus" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "InvestorCompanyLink" (
	"id" text PRIMARY KEY NOT NULL,
	"investorId" text NOT NULL,
	"companyId" text NOT NULL,
	"status" "InvestorCompanyLinkStatus" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InvestorCompanyLink" ADD CONSTRAINT "InvestorCompanyLink_investorId_Investor_id_fk" FOREIGN KEY ("investorId") REFERENCES "public"."Investor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvestorCompanyLink" ADD CONSTRAINT "InvestorCompanyLink_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "investor_company_link_investor_unique_idx" ON "InvestorCompanyLink" USING btree ("investorId");--> statement-breakpoint
CREATE UNIQUE INDEX "investor_company_link_company_unique_idx" ON "InvestorCompanyLink" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "investor_company_link_status_idx" ON "InvestorCompanyLink" USING btree ("status");--> statement-breakpoint
CREATE INDEX "investor_company_link_created_at_idx" ON "InvestorCompanyLink" USING btree ("createdAt");