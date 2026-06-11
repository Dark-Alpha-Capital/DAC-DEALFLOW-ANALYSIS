ALTER TABLE "Lead" ADD COLUMN "duplicateCompanyId" text;--> statement-breakpoint
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_duplicateCompanyId_Company_id_fk" FOREIGN KEY ("duplicateCompanyId") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_duplicate_company_idx" ON "Lead" USING btree ("duplicateCompanyId");
