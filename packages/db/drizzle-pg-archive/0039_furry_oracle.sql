CREATE TYPE "public"."CimScreeningSessionStatus" AS ENUM('PENDING', 'INGESTING', 'SCREENING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."DealCimStatus" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "CimScreeningAnswer" (
	"id" text PRIMARY KEY NOT NULL,
	"runId" text NOT NULL,
	"questionId" text NOT NULL,
	"score" integer NOT NULL,
	"rationale" text NOT NULL,
	"evidenceChunkIds" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CimScreeningRun" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"screenerId" text NOT NULL,
	"workflowInstanceId" text,
	"status" "CimScreeningSessionStatus" DEFAULT 'PENDING' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CimScreeningSession" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"documentId" text,
	"dealOpportunityId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cim_screening_session_scope_check" CHECK (("CimScreeningSession"."documentId" IS NOT NULL AND "CimScreeningSession"."dealOpportunityId" IS NULL) OR ("CimScreeningSession"."documentId" IS NULL AND "CimScreeningSession"."dealOpportunityId" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "DealCim" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"documentId" text NOT NULL,
	"storageKey" text NOT NULL,
	"status" "DealCimStatus" DEFAULT 'ACTIVE' NOT NULL,
	"uploadedById" text,
	"uploadedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DealSim" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "SimScreeningAnswer" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "SimScreeningRun" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "SimScreeningSession" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "DealSim" CASCADE;--> statement-breakpoint
DROP TABLE "SimScreeningAnswer" CASCADE;--> statement-breakpoint
DROP TABLE "SimScreeningRun" CASCADE;--> statement-breakpoint
DROP TABLE "SimScreeningSession" CASCADE;--> statement-breakpoint
ALTER TABLE "Document" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Document" ALTER COLUMN "category" SET DEFAULT 'OTHER'::text;--> statement-breakpoint
DROP TYPE "public"."DocumentCategory";--> statement-breakpoint
CREATE TYPE "public"."DocumentCategory" AS ENUM('FINANCIALS', 'LEGAL', 'TAX', 'TECHNICAL', 'COMMERCIAL', 'ESG', 'MARKETING', 'OPERATIONS', 'DOCUMENTATION', 'INVESTOR_RELATIONSHIPS', 'TOOLS', 'LEGISLATION', 'RESEARCH', 'PROSPECTUS', 'OTHER', 'OPERATING_PLAYBOOK', 'INVESTMENT_MEMO', 'IC_TEMPLATE', 'INDUSTRY_RESEARCH', 'VALUE_CREATION_PLAYBOOK', 'PAST_DEAL_ANALYSIS', 'DUE_DILIGENCE_CHECKLIST', 'CIM_SCREENING', 'CIM');--> statement-breakpoint
ALTER TABLE "Document" ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."DocumentCategory";--> statement-breakpoint
ALTER TABLE "Document" ALTER COLUMN "category" SET DATA TYPE "public"."DocumentCategory" USING "category"::"public"."DocumentCategory";--> statement-breakpoint
DROP INDEX "cim_extraction_sim_idx";--> statement-breakpoint
DROP INDEX "cim_extraction_sim_unique_idx";--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD COLUMN "dealCimId" text;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "CimScreeningAnswer" ADD CONSTRAINT "CimScreeningAnswer_runId_CimScreeningRun_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."CimScreeningRun"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CimScreeningAnswer" ADD CONSTRAINT "CimScreeningAnswer_questionId_ScreenerQuestion_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."ScreenerQuestion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CimScreeningRun" ADD CONSTRAINT "CimScreeningRun_sessionId_CimScreeningSession_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."CimScreeningSession"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CimScreeningRun" ADD CONSTRAINT "CimScreeningRun_screenerId_ScreenerTemplate_id_fk" FOREIGN KEY ("screenerId") REFERENCES "public"."ScreenerTemplate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CimScreeningSession" ADD CONSTRAINT "CimScreeningSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CimScreeningSession" ADD CONSTRAINT "CimScreeningSession_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CimScreeningSession" ADD CONSTRAINT "CimScreeningSession_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealCim" ADD CONSTRAINT "DealCim_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealCim" ADD CONSTRAINT "DealCim_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealCim" ADD CONSTRAINT "DealCim_uploadedById_User_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cim_screening_answer_run_question_unique" ON "CimScreeningAnswer" USING btree ("runId","questionId");--> statement-breakpoint
CREATE INDEX "cim_screening_answer_run_idx" ON "CimScreeningAnswer" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "cim_screening_run_session_idx" ON "CimScreeningRun" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "cim_screening_session_user_idx" ON "CimScreeningSession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "cim_screening_session_document_idx" ON "CimScreeningSession" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "cim_screening_session_deal_opp_idx" ON "CimScreeningSession" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "deal_cim_deal_opp_idx" ON "DealCim" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_cim_active_unique_idx" ON "DealCim" USING btree ("dealOpportunityId") WHERE "DealCim"."status" = 'ACTIVE';--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD CONSTRAINT "CIMExtraction_dealCimId_DealCim_id_fk" FOREIGN KEY ("dealCimId") REFERENCES "public"."DealCim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cim_extraction_deal_cim_idx" ON "CIMExtraction" USING btree ("dealCimId");--> statement-breakpoint
CREATE UNIQUE INDEX "cim_extraction_deal_cim_unique_idx" ON "CIMExtraction" USING btree ("dealCimId");--> statement-breakpoint
ALTER TABLE "CIMExtraction" DROP COLUMN "simId";--> statement-breakpoint
DROP TYPE "public"."DealSimStatus";--> statement-breakpoint
DROP TYPE "public"."SimScreeningSessionStatus";