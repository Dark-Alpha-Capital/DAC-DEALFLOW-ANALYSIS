ALTER TABLE "Company" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Lead" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "company_first_seen_from_lead_unique_idx" ON "Company" USING btree ("firstSeenFromLeadId");