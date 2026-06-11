CREATE TABLE "DealOpportunityCompanyLink" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"companyId" text NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InvestorDealOpportunityLink" (
	"id" text PRIMARY KEY NOT NULL,
	"investorId" text NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "contentHash" text;--> statement-breakpoint
ALTER TABLE "DealOpportunityCompanyLink" ADD CONSTRAINT "DealOpportunityCompanyLink_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunityCompanyLink" ADD CONSTRAINT "DealOpportunityCompanyLink_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvestorDealOpportunityLink" ADD CONSTRAINT "InvestorDealOpportunityLink_investorId_Investor_id_fk" FOREIGN KEY ("investorId") REFERENCES "public"."Investor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvestorDealOpportunityLink" ADD CONSTRAINT "InvestorDealOpportunityLink_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deal_opp_company_link_unique_idx" ON "DealOpportunityCompanyLink" USING btree ("dealOpportunityId","companyId");--> statement-breakpoint
CREATE INDEX "deal_opp_company_link_deal_idx" ON "DealOpportunityCompanyLink" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "deal_opp_company_link_company_idx" ON "DealOpportunityCompanyLink" USING btree ("companyId");--> statement-breakpoint
CREATE UNIQUE INDEX "investor_deal_link_unique_idx" ON "InvestorDealOpportunityLink" USING btree ("investorId","dealOpportunityId");--> statement-breakpoint
CREATE INDEX "investor_deal_link_investor_idx" ON "InvestorDealOpportunityLink" USING btree ("investorId");--> statement-breakpoint
CREATE INDEX "investor_deal_link_deal_idx" ON "InvestorDealOpportunityLink" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE UNIQUE INDEX "document_company_content_hash_unique_idx" ON "Document" USING btree ("companyId","contentHash") WHERE "Document"."companyId" IS NOT NULL AND "Document"."contentHash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "document_lead_content_hash_unique_idx" ON "Document" USING btree ("leadId","contentHash") WHERE "Document"."leadId" IS NOT NULL AND "Document"."contentHash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "document_deal_opp_content_hash_unique_idx" ON "Document" USING btree ("dealOpportunityId","contentHash") WHERE "Document"."dealOpportunityId" IS NOT NULL AND "Document"."contentHash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "document_theme_content_hash_unique_idx" ON "Document" USING btree ("themeId","contentHash") WHERE "Document"."themeId" IS NOT NULL AND "Document"."contentHash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "document_global_content_hash_unique_idx" ON "Document" USING btree ("contentHash") WHERE "Document"."entityType" = 'GLOBAL' AND "Document"."contentHash" IS NOT NULL;