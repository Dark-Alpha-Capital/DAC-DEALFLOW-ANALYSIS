CREATE TYPE "public"."DealScreeningStatus" AS ENUM('PASS', 'FAIL', 'INCOMPLETE');--> statement-breakpoint
CREATE TYPE "public"."ReviewState" AS ENUM('NOT_SEEN', 'SEEN', 'REVIEWED', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."ScreenerResponseSource" AS ENUM('AI', 'HUMAN');--> statement-breakpoint
CREATE TYPE "public"."ScreenerResponseType" AS ENUM('SCORE');--> statement-breakpoint
CREATE TABLE "CIMExtraction" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"revenueHistory" jsonb,
	"ebitdaHistory" jsonb,
	"employeeCount" integer,
	"customerConcentration" double precision,
	"capexIntensity" text,
	"revenueBreakdown" jsonb,
	"growthDrivers" text[],
	"keyRisks" text[],
	"industryOverview" text,
	"transactionDetails" text,
	"modelName" text,
	"version" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DealOpportunityScreening" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"status" "DealScreeningStatus" NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"reasons" text[] DEFAULT '{}' NOT NULL,
	"score" integer,
	"ebitdaFitScore" integer,
	"revenueScore" integer,
	"industryScore" integer,
	"profileKey" text NOT NULL,
	"profileVersion" text NOT NULL,
	"screenedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ScreenerQuestion" (
	"id" text PRIMARY KEY NOT NULL,
	"screenerId" text NOT NULL,
	"question" text NOT NULL,
	"weight" integer DEFAULT 10 NOT NULL,
	"responseType" "ScreenerResponseType" DEFAULT 'SCORE' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ScreenerResponse" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"questionId" text NOT NULL,
	"score" integer NOT NULL,
	"source" "ScreenerResponseSource" NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ScreenerTemplate" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ThemeCompanyCoverage" (
	"id" text PRIMARY KEY NOT NULL,
	"themeId" text NOT NULL,
	"companyId" text NOT NULL,
	"coverageStatus" "CompanyCoverageStatus" DEFAULT 'UNCONTACTED' NOT NULL,
	"lastOutreachAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Screener" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "Screener" CASCADE;--> statement-breakpoint
ALTER TABLE "AiScreening" DROP CONSTRAINT "AiScreening_screenerId_Screener_id_fk";
--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD COLUMN "reviewState" "ReviewState" DEFAULT 'NOT_SEEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "Deal" ADD COLUMN "reviewState" "ReviewState" DEFAULT 'NOT_SEEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "Lead" ADD COLUMN "duplicateCompanyId" text;--> statement-breakpoint
ALTER TABLE "ThemePerformance" ADD COLUMN "observedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "Theme" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD CONSTRAINT "CIMExtraction_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD CONSTRAINT "CIMExtraction_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunityScreening" ADD CONSTRAINT "DealOpportunityScreening_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ScreenerQuestion" ADD CONSTRAINT "ScreenerQuestion_screenerId_ScreenerTemplate_id_fk" FOREIGN KEY ("screenerId") REFERENCES "public"."ScreenerTemplate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ScreenerResponse" ADD CONSTRAINT "ScreenerResponse_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ScreenerResponse" ADD CONSTRAINT "ScreenerResponse_questionId_ScreenerQuestion_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."ScreenerQuestion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ThemeCompanyCoverage" ADD CONSTRAINT "ThemeCompanyCoverage_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ThemeCompanyCoverage" ADD CONSTRAINT "ThemeCompanyCoverage_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cim_extraction_deal_opp_idx" ON "CIMExtraction" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE UNIQUE INDEX "cim_extraction_deal_opp_unique_idx" ON "CIMExtraction" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_opp_screening_deal_unique_idx" ON "DealOpportunityScreening" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "deal_opp_screening_status_idx" ON "DealOpportunityScreening" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deal_opp_screening_score_idx" ON "DealOpportunityScreening" USING btree ("score");--> statement-breakpoint
CREATE INDEX "screener_question_screener_idx" ON "ScreenerQuestion" USING btree ("screenerId");--> statement-breakpoint
CREATE UNIQUE INDEX "screener_question_order_unique_idx" ON "ScreenerQuestion" USING btree ("screenerId","position");--> statement-breakpoint
CREATE INDEX "screener_response_deal_opp_idx" ON "ScreenerResponse" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "screener_response_question_idx" ON "ScreenerResponse" USING btree ("questionId");--> statement-breakpoint
CREATE UNIQUE INDEX "screener_response_unique_idx" ON "ScreenerResponse" USING btree ("dealOpportunityId","questionId","source");--> statement-breakpoint
CREATE INDEX "screener_template_category_idx" ON "ScreenerTemplate" USING btree ("category");--> statement-breakpoint
CREATE INDEX "screener_template_name_idx" ON "ScreenerTemplate" USING btree ("name");--> statement-breakpoint
CREATE INDEX "theme_company_coverage_theme_idx" ON "ThemeCompanyCoverage" USING btree ("themeId");--> statement-breakpoint
CREATE INDEX "theme_company_coverage_company_idx" ON "ThemeCompanyCoverage" USING btree ("companyId");--> statement-breakpoint
CREATE UNIQUE INDEX "theme_company_coverage_unique_idx" ON "ThemeCompanyCoverage" USING btree ("themeId","companyId");--> statement-breakpoint
ALTER TABLE "AiScreening" ADD CONSTRAINT "AiScreening_screenerId_ScreenerTemplate_id_fk" FOREIGN KEY ("screenerId") REFERENCES "public"."ScreenerTemplate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "industry_intel_theme_idx" ON "IndustryIntelligence" USING btree ("themeId");--> statement-breakpoint
CREATE UNIQUE INDEX "industry_intel_active_theme_unique_idx" ON "IndustryIntelligence" USING btree ("themeId") WHERE "IndustryIntelligence"."isActive" = true;--> statement-breakpoint
CREATE INDEX "lead_duplicate_company_idx" ON "Lead" USING btree ("duplicateCompanyId");--> statement-breakpoint
CREATE INDEX "thesis_theme_idx" ON "Thesis" USING btree ("themeId");--> statement-breakpoint
CREATE UNIQUE INDEX "thesis_active_theme_unique_idx" ON "Thesis" USING btree ("themeId") WHERE "Thesis"."isActive" = true;--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP COLUMN "isPublished";--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP COLUMN "isReviewed";--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP COLUMN "seen";--> statement-breakpoint
ALTER TABLE "Deal" DROP COLUMN "isPublished";--> statement-breakpoint
ALTER TABLE "Deal" DROP COLUMN "isReviewed";--> statement-breakpoint
ALTER TABLE "Deal" DROP COLUMN "seen";