CREATE TYPE "public"."CompanyCoverageStatus" AS ENUM('UNCONTACTED', 'CONTACTED', 'IN_DISCUSSION', 'UNDER_LOI', 'CLOSED', 'PASSED');--> statement-breakpoint
CREATE TYPE "public"."ContactEntityType" AS ENUM('LEAD', 'COMPANY', 'DEAL_OPPORTUNITY');--> statement-breakpoint
CREATE TYPE "public"."DealStage" AS ENUM('LISTED', 'INITIAL_REVIEW', 'SCREENED', 'MEETING_HELD', 'IOI_SUBMITTED', 'LOI_SUBMITTED', 'DILIGENCE', 'CLOSED', 'DEAD');--> statement-breakpoint
CREATE TYPE "public"."DealStatus" AS ENUM('AVAILABLE', 'SOLD', 'UNDER_CONTRACT', 'NOT_SPECIFIED');--> statement-breakpoint
CREATE TYPE "public"."DealType" AS ENUM('SCRAPED', 'MANUAL', 'AI_INFERRED');--> statement-breakpoint
CREATE TYPE "public"."DocumentCategory" AS ENUM('FINANCIALS', 'LEGAL', 'TAX', 'TECHNICAL', 'COMMERCIAL', 'ESG', 'MARKETING', 'OPERATIONS', 'DOCUMENTATION', 'INVESTOR_RELATIONSHIPS', 'TOOLS', 'LEGISLATION', 'RESEARCH', 'PROSPECTUS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."DocumentEntityType" AS ENUM('LEAD', 'COMPANY', 'DEAL_OPPORTUNITY');--> statement-breakpoint
CREATE TYPE "public"."EntityType" AS ENUM('DEAL', 'COMPANY');--> statement-breakpoint
CREATE TYPE "public"."LeadStatus" AS ENUM('NEW', 'PROCESSED', 'DUPLICATE', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."Sentiment" AS ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE');--> statement-breakpoint
CREATE TYPE "public"."ThemeStatus" AS ENUM('ACTIVE', 'PAUSED', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "Account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"idToken" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AiScreening" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"title" text NOT NULL,
	"explanation" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"sentiment" "Sentiment" DEFAULT 'NEUTRAL' NOT NULL,
	"content" text,
	"score" integer,
	"screenerId" text
);
--> statement-breakpoint
CREATE TABLE "Company" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalizedName" text NOT NULL,
	"industry" text,
	"location" text,
	"revenueEstimate" double precision,
	"ebitdaEstimate" double precision,
	"ebitdaMarginEstimate" double precision,
	"recurringRevenuePct" double precision,
	"customerConcentrationPct" double precision,
	"founderAgeEstimate" integer,
	"themeId" text,
	"attractivenessScore" integer,
	"coverageStatus" "CompanyCoverageStatus" DEFAULT 'UNCONTACTED' NOT NULL,
	"firstSeenAt" timestamp,
	"lastSeenAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Company_normalizedName_unique" UNIQUE("normalizedName")
);
--> statement-breakpoint
CREATE TABLE "Contact" (
	"id" text PRIMARY KEY NOT NULL,
	"entityType" "ContactEntityType" NOT NULL,
	"entityId" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"linkedinUrl" text,
	"role" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DealOpportunity" (
	"id" text PRIMARY KEY NOT NULL,
	"companyId" text NOT NULL,
	"leadId" text,
	"legacyDealId" text,
	"sourceWebsite" text,
	"brokerage" text,
	"askingPrice" double precision,
	"impliedMultiple" double precision,
	"dealTeaser" text,
	"description" text,
	"dealType" "DealType" DEFAULT 'MANUAL' NOT NULL,
	"stage" "DealStage" DEFAULT 'LISTED' NOT NULL,
	"status" "DealStatus" DEFAULT 'AVAILABLE' NOT NULL,
	"tags" text[] DEFAULT '{}',
	"isPublished" boolean DEFAULT false NOT NULL,
	"isReviewed" boolean DEFAULT false NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"bitrixId" text,
	"bitrixLink" text,
	"bitrixCreatedAt" timestamp,
	"brokerFirstName" text,
	"brokerLastName" text,
	"brokerEmail" text,
	"brokerPhone" text,
	"brokerLinkedIn" text,
	"userId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "DealOpportunity_legacyDealId_unique" UNIQUE("legacyDealId")
);
--> statement-breakpoint
CREATE TABLE "Deal" (
	"id" text PRIMARY KEY NOT NULL,
	"brokerage" text NOT NULL,
	"firstName" text,
	"lastName" text,
	"linkedinUrl" text,
	"workPhone" text,
	"dealCaption" text NOT NULL,
	"revenue" double precision NOT NULL,
	"ebitda" double precision NOT NULL,
	"title" text,
	"grossRevenue" double precision,
	"askingPrice" double precision,
	"ebitdaMargin" double precision NOT NULL,
	"industry" text NOT NULL,
	"dealType" "DealType" DEFAULT 'MANUAL' NOT NULL,
	"sourceWebsite" text NOT NULL,
	"companyLocation" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"email" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"bitrixCreatedAt" timestamp,
	"bitrixId" text,
	"userId" text,
	"dealTeaser" text,
	"tags" text[] DEFAULT '{}',
	"bitrixLink" text,
	"isPublished" boolean DEFAULT false NOT NULL,
	"isReviewed" boolean DEFAULT false NOT NULL,
	"status" "DealStatus" DEFAULT 'NOT_SPECIFIED' NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"chunk_text" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "Document" (
	"id" text PRIMARY KEY NOT NULL,
	"entityType" "DocumentEntityType" NOT NULL,
	"entityId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "DocumentCategory" DEFAULT 'OTHER' NOT NULL,
	"fileUrl" text NOT NULL,
	"fileName" text NOT NULL,
	"fileSize" integer,
	"mimeType" text,
	"uploadedById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "IndustryIntelligence" (
	"id" text PRIMARY KEY NOT NULL,
	"themeId" text NOT NULL,
	"tam" double precision,
	"growthRate" double precision,
	"avgEbitdaMargin" double precision,
	"avgEntryMultiple" double precision,
	"avgExitMultiple" double precision,
	"fragmentationScore" integer,
	"sponsorPenetration" double precision,
	"cyclicalityScore" integer,
	"disruptionRiskScore" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Lead" (
	"id" text PRIMARY KEY NOT NULL,
	"sourceWebsite" text NOT NULL,
	"externalListingId" text,
	"rawTitle" text NOT NULL,
	"rawDescription" text,
	"rawIndustry" text,
	"revenue" double precision,
	"ebitda" double precision,
	"askingPrice" double precision,
	"brokerage" text,
	"brokerFirstName" text,
	"brokerLastName" text,
	"brokerEmail" text,
	"brokerPhone" text,
	"status" "LeadStatus" DEFAULT 'NEW' NOT NULL,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" text PRIMARY KEY NOT NULL,
	"fileUrl" text NOT NULL,
	"title" text NOT NULL,
	"purpose" text NOT NULL,
	"author" text NOT NULL,
	"version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Screener" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"content" text NOT NULL,
	"fileUrl" text NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ThemePerformance" (
	"id" text PRIMARY KEY NOT NULL,
	"themeId" text,
	"dealsSourced" integer,
	"meetingsHeld" integer,
	"loisIssued" integer,
	"dealsClosed" integer,
	"averageEntryMultiple" double precision,
	"averageIRR" double precision,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Theme" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sector" text NOT NULL,
	"status" "ThemeStatus" DEFAULT 'ACTIVE' NOT NULL,
	"capitalPriorityScore" integer,
	"confidenceScore" integer,
	"createdById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Thesis" (
	"id" text PRIMARY KEY NOT NULL,
	"themeId" text NOT NULL,
	"summary" text NOT NULL,
	"macroDrivers" text[],
	"mispricingHypothesis" text,
	"valueCreationLevers" text[],
	"exitLogic" text,
	"riskFactors" text[],
	"version" text DEFAULT '1.0',
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserActionLog" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "UserRole" DEFAULT 'USER' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"isBlocked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AiScreening" ADD CONSTRAINT "AiScreening_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AiScreening" ADD CONSTRAINT "AiScreening_screenerId_Screener_id_fk" FOREIGN KEY ("screenerId") REFERENCES "public"."Screener"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Company" ADD CONSTRAINT "Company_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD CONSTRAINT "DealOpportunity_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD CONSTRAINT "DealOpportunity_leadId_Lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD CONSTRAINT "DealOpportunity_legacyDealId_Deal_id_fk" FOREIGN KEY ("legacyDealId") REFERENCES "public"."Deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD CONSTRAINT "DealOpportunity_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_User_id_fk" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "IndustryIntelligence" ADD CONSTRAINT "IndustryIntelligence_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ThemePerformance" ADD CONSTRAINT "ThemePerformance_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Thesis" ADD CONSTRAINT "Thesis_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserActionLog" ADD CONSTRAINT "UserActionLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;