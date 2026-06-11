ALTER TABLE "CIMExtraction" DROP CONSTRAINT IF EXISTS "CIMExtraction_updatedByUserId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Company" DROP CONSTRAINT IF EXISTS "Company_themeId_Theme_id_fk";
--> statement-breakpoint
ALTER TABLE "Company" DROP CONSTRAINT IF EXISTS "Company_firstSeenFromLeadId_Lead_id_fk";
--> statement-breakpoint
ALTER TABLE "CompanyNote" DROP CONSTRAINT IF EXISTS "CompanyNote_createdById_User_id_fk";
--> statement-breakpoint
ALTER TABLE "DealFinancialSnapshot" DROP CONSTRAINT IF EXISTS "DealFinancialSnapshot_createdById_User_id_fk";
--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP CONSTRAINT IF EXISTS "DealOpportunity_leadId_Lead_id_fk";
--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP CONSTRAINT IF EXISTS "DealOpportunity_legacyDealId_Deal_id_fk";
--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP CONSTRAINT IF EXISTS "DealOpportunity_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "DealRiskFlag" DROP CONSTRAINT IF EXISTS "DealRiskFlag_createdById_User_id_fk";
--> statement-breakpoint
ALTER TABLE "DealSim" DROP CONSTRAINT IF EXISTS "DealSim_uploadedById_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Deal" DROP CONSTRAINT IF EXISTS "Deal_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_uploadedById_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Outreach" DROP CONSTRAINT IF EXISTS "Outreach_dealOpportunityId_DealOpportunity_id_fk";
--> statement-breakpoint
ALTER TABLE "Outreach" DROP CONSTRAINT IF EXISTS "Outreach_companyId_Company_id_fk";
--> statement-breakpoint
ALTER TABLE "Outreach" DROP CONSTRAINT IF EXISTS "Outreach_createdById_User_id_fk";
--> statement-breakpoint
ALTER TABLE "ThemePerformance" DROP CONSTRAINT IF EXISTS "ThemePerformance_themeId_Theme_id_fk";
--> statement-breakpoint
ALTER TABLE "Theme" DROP CONSTRAINT IF EXISTS "Theme_createdById_User_id_fk";
--> statement-breakpoint
ALTER TABLE "UserActionLog" DROP CONSTRAINT IF EXISTS "UserActionLog_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Contact" ADD COLUMN "companyId" text;--> statement-breakpoint
ALTER TABLE "Contact" ADD COLUMN "leadId" text;--> statement-breakpoint
ALTER TABLE "Contact" ADD COLUMN "dealOpportunityId" text;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "companyId" text;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "leadId" text;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "dealOpportunityId" text;--> statement-breakpoint
ALTER TABLE "CIMExtractionLog" ADD CONSTRAINT "CIMExtractionLog_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD CONSTRAINT "CIMExtraction_updatedByUserId_User_id_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Company" ADD CONSTRAINT "Company_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Company" ADD CONSTRAINT "Company_firstSeenFromLeadId_Lead_id_fk" FOREIGN KEY ("firstSeenFromLeadId") REFERENCES "public"."Lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CompanyNote" ADD CONSTRAINT "CompanyNote_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_leadId_Lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealFinancialSnapshot" ADD CONSTRAINT "DealFinancialSnapshot_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD CONSTRAINT "DealOpportunity_leadId_Lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD CONSTRAINT "DealOpportunity_legacyDealId_Deal_id_fk" FOREIGN KEY ("legacyDealId") REFERENCES "public"."Deal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD CONSTRAINT "DealOpportunity_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealRiskFlag" ADD CONSTRAINT "DealRiskFlag_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealSim" ADD CONSTRAINT "DealSim_uploadedById_User_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_leadId_Lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_User_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_duplicateCompanyId_Company_id_fk" FOREIGN KEY ("duplicateCompanyId") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ThemePerformance" ADD CONSTRAINT "ThemePerformance_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserActionLog" ADD CONSTRAINT "UserActionLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;