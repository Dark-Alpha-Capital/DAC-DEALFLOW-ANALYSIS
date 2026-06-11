ALTER TABLE "ChatSession" ADD COLUMN "companyId" text;--> statement-breakpoint
ALTER TABLE "ChatSession" ADD COLUMN "leadId" text;--> statement-breakpoint
ALTER TABLE "ChatSession" ADD COLUMN "dealOpportunityId" text;--> statement-breakpoint
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_leadId_Lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE set null ON UPDATE no action;