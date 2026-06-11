ALTER TABLE "SimScreeningSession" ALTER COLUMN "documentId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "SimScreeningSession" ADD COLUMN "dealOpportunityId" text;--> statement-breakpoint
ALTER TABLE "SimScreeningSession" ADD CONSTRAINT "SimScreeningSession_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sim_screening_session_deal_opp_idx" ON "SimScreeningSession" USING btree ("dealOpportunityId");--> statement-breakpoint
ALTER TABLE "SimScreeningSession" ADD CONSTRAINT "sim_screening_session_scope_check" CHECK (("documentId" IS NOT NULL AND "dealOpportunityId" IS NULL) OR ("documentId" IS NULL AND "dealOpportunityId" IS NOT NULL));