CREATE TYPE "public"."InvestorInteractionType" AS ENUM('EMAIL', 'CALL', 'MEETING', 'EVENT', 'INTRO');--> statement-breakpoint
CREATE TYPE "public"."InvestorLeadStatus" AS ENUM('RAW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."InvestorStatus" AS ENUM('PROSPECT', 'QUALIFIED', 'ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."InvestorType" AS ENUM('HNWI', 'FAMILY_OFFICE', 'INSTITUTION');--> statement-breakpoint
CREATE TABLE "InvestorInteraction" (
	"id" text PRIMARY KEY NOT NULL,
	"investorId" text,
	"investorLeadId" text,
	"type" "InvestorInteractionType",
	"notes" text,
	"outcome" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InvestorLead" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"source" text,
	"email" text,
	"phone" text,
	"inferredType" text,
	"notes" text,
	"status" "InvestorLeadStatus" DEFAULT 'RAW' NOT NULL,
	"ownerUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Investor" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "InvestorType" NOT NULL,
	"primaryContactName" text,
	"email" text,
	"phone" text,
	"geography" text,
	"minCheckSize" numeric,
	"maxCheckSize" numeric,
	"sectorFocus" text[],
	"stagePreference" text[],
	"riskProfile" text,
	"status" "InvestorStatus" DEFAULT 'PROSPECT' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "InvestorInteraction" ADD CONSTRAINT "InvestorInteraction_investorId_Investor_id_fk" FOREIGN KEY ("investorId") REFERENCES "public"."Investor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvestorInteraction" ADD CONSTRAINT "InvestorInteraction_investorLeadId_InvestorLead_id_fk" FOREIGN KEY ("investorLeadId") REFERENCES "public"."InvestorLead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InvestorLead" ADD CONSTRAINT "InvestorLead_ownerUserId_User_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investor_interaction_investor_idx" ON "InvestorInteraction" USING btree ("investorId","createdAt");--> statement-breakpoint
CREATE INDEX "investor_interaction_lead_idx" ON "InvestorInteraction" USING btree ("investorLeadId","createdAt");--> statement-breakpoint
CREATE INDEX "investor_lead_owner_idx" ON "InvestorLead" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "investor_lead_status_idx" ON "InvestorLead" USING btree ("status");