CREATE TYPE "public"."CompanyFinancialSnapshotSource" AS ENUM('MANAGEMENT', 'CIM', 'MANUAL');--> statement-breakpoint
CREATE TABLE "CompanyFinancialSnapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"companyId" text NOT NULL,
	"periodEnd" timestamp NOT NULL,
	"revenue" double precision,
	"ebitda" double precision,
	"grossMargin" double precision,
	"revenueCagr" double precision,
	"employees" integer,
	"totalClients" integer,
	"top10Concentration" double precision,
	"recurringRevenuePct" double precision,
	"source" "CompanyFinancialSnapshotSource" NOT NULL,
	"notes" text,
	"createdById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "businessModel" text;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "employees" integer;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "revenueTtm" double precision;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "ebitdaTtm" double precision;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "grossMargin" double precision;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "revenueCagr" double precision;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "totalClients" integer;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "top10Concentration" double precision;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "customerIndustries" text[];--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "revenueModelType" text;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "expansionModel" text;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "concentrationHigh" boolean;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "marginLow" boolean;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "vendorDependency" boolean;--> statement-breakpoint
ALTER TABLE "Company" ADD COLUMN "growthLevers" text[];--> statement-breakpoint
ALTER TABLE "CompanyFinancialSnapshot" ADD CONSTRAINT "CompanyFinancialSnapshot_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CompanyFinancialSnapshot" ADD CONSTRAINT "CompanyFinancialSnapshot_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_fin_snapshot_company_idx" ON "CompanyFinancialSnapshot" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "company_fin_snapshot_company_period_idx" ON "CompanyFinancialSnapshot" USING btree ("companyId","periodEnd");