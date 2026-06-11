CREATE TYPE "public"."OutreachType" AS ENUM('EMAIL', 'CALL', 'LINKEDIN', 'MEETING');--> statement-breakpoint
CREATE TABLE "Outreach" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text,
	"companyId" text,
	"type" "OutreachType" NOT NULL,
	"notes" text,
	"outcome" text,
	"createdById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Company" DROP CONSTRAINT "Company_normalizedName_unique";--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "firstSeenFromLeadId" text;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD COLUMN "revenue" double precision;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD COLUMN "ebitda" double precision;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD COLUMN "ebitdaMargin" double precision;--> statement-breakpoint
ALTER TABLE "IndustryIntelligence" ADD COLUMN "version" text DEFAULT '1.0';--> statement-breakpoint
ALTER TABLE "IndustryIntelligence" ADD COLUMN "isActive" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "Lead" ADD COLUMN "normalizedCompanyName" text;--> statement-breakpoint
ALTER TABLE "Lead" ADD COLUMN "companyLocation" text;--> statement-breakpoint
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Company" ADD CONSTRAINT "Company_firstSeenFromLeadId_Lead_id_fk" FOREIGN KEY ("firstSeenFromLeadId") REFERENCES "public"."Lead"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_screening_deal_opp_idx" ON "AiScreening" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "company_dedup_idx" ON "Company" USING btree ("normalizedName","location");--> statement-breakpoint
CREATE INDEX "company_theme_idx" ON "Company" USING btree ("themeId");--> statement-breakpoint
CREATE INDEX "deal_opp_company_idx" ON "DealOpportunity" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "deal_opp_stage_idx" ON "DealOpportunity" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "deal_opp_status_idx" ON "DealOpportunity" USING btree ("status");