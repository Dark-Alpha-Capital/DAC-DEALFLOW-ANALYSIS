CREATE TYPE "public"."CIMExtractionSource" AS ENUM('AI', 'USER');--> statement-breakpoint
CREATE TYPE "public"."DealSimStatus" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "DealSim" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"documentId" text NOT NULL,
	"storageKey" text NOT NULL,
	"status" "DealSimStatus" DEFAULT 'ACTIVE' NOT NULL,
	"uploadedById" text,
	"uploadedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "cim_extraction_deal_opp_unique_idx";--> statement-breakpoint
ALTER TABLE "CIMExtraction" ALTER COLUMN "documentId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "CIMExtraction" ALTER COLUMN "dealOpportunityId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD COLUMN "simId" text;--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD COLUMN "source" "CIMExtractionSource" DEFAULT 'AI' NOT NULL;--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD COLUMN "updatedByUserId" text;--> statement-breakpoint
ALTER TABLE "DealSim" ADD CONSTRAINT "DealSim_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealSim" ADD CONSTRAINT "DealSim_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealSim" ADD CONSTRAINT "DealSim_uploadedById_User_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_sim_deal_opp_idx" ON "DealSim" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_sim_active_unique_idx" ON "DealSim" USING btree ("dealOpportunityId") WHERE "DealSim"."status" = 'ACTIVE';--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD CONSTRAINT "CIMExtraction_simId_DealSim_id_fk" FOREIGN KEY ("simId") REFERENCES "public"."DealSim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD CONSTRAINT "CIMExtraction_updatedByUserId_User_id_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cim_extraction_sim_idx" ON "CIMExtraction" USING btree ("simId");--> statement-breakpoint
CREATE UNIQUE INDEX "cim_extraction_sim_unique_idx" ON "CIMExtraction" USING btree ("simId");--> statement-breakpoint
ALTER TABLE "CIMExtraction" DROP COLUMN "debugNote";