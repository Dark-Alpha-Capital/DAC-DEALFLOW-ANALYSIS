CREATE TYPE "public"."DealFinancialSnapshotSource" AS ENUM('LISTING', 'BROKER_CALL', 'CIM', 'MANAGEMENT_MEETING', 'DILIGENCE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."DealRiskSeverity" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."DealRiskSource" AS ENUM('SYSTEM', 'USER');--> statement-breakpoint
CREATE TYPE "public"."DealRiskType" AS ENUM('CUSTOMER_CONCENTRATION', 'CAPEX', 'QUALITY_OF_EARNINGS', 'WORKING_CAPITAL', 'OTHER');--> statement-breakpoint
CREATE TABLE "DealFinancialSnapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"revenue" double precision,
	"ebitda" double precision,
	"ebitdaMargin" double precision,
	"askingPrice" double precision,
	"impliedMultiple" double precision,
	"source" "DealFinancialSnapshotSource" NOT NULL,
	"notes" text,
	"createdById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DealRiskFlag" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"riskType" "DealRiskType" NOT NULL,
	"severity" "DealRiskSeverity" NOT NULL,
	"description" text NOT NULL,
	"source" "DealRiskSource" DEFAULT 'USER' NOT NULL,
	"createdById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DealFinancialSnapshot" ADD CONSTRAINT "DealFinancialSnapshot_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealFinancialSnapshot" ADD CONSTRAINT "DealFinancialSnapshot_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealRiskFlag" ADD CONSTRAINT "DealRiskFlag_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealRiskFlag" ADD CONSTRAINT "DealRiskFlag_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_fin_snapshot_deal_opp_idx" ON "DealFinancialSnapshot" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "deal_fin_snapshot_deal_opp_created_at_idx" ON "DealFinancialSnapshot" USING btree ("dealOpportunityId","createdAt");--> statement-breakpoint
CREATE INDEX "deal_fin_snapshot_deal_opp_source_created_at_idx" ON "DealFinancialSnapshot" USING btree ("dealOpportunityId","source","createdAt");--> statement-breakpoint
CREATE INDEX "deal_risk_flag_deal_opp_idx" ON "DealRiskFlag" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "deal_risk_flag_deal_opp_created_at_idx" ON "DealRiskFlag" USING btree ("dealOpportunityId","createdAt");--> statement-breakpoint
CREATE INDEX "deal_risk_flag_deal_opp_type_severity_idx" ON "DealRiskFlag" USING btree ("dealOpportunityId","riskType","severity");