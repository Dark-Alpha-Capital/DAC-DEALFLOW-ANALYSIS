ALTER TABLE "Theme" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "ThemePerformance" ADD COLUMN "observedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint

UPDATE "Thesis" t
SET "isActive" = false
FROM (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "themeId"
        ORDER BY "createdAt" DESC, "id" DESC
      ) AS rn
    FROM "Thesis"
    WHERE "isActive" = true
  ) ranked
  WHERE ranked.rn > 1
) dup
WHERE t."id" = dup."id";--> statement-breakpoint

UPDATE "IndustryIntelligence" i
SET "isActive" = false
FROM (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "themeId"
        ORDER BY "createdAt" DESC, "id" DESC
      ) AS rn
    FROM "IndustryIntelligence"
    WHERE "isActive" = true
  ) ranked
  WHERE ranked.rn > 1
) dup
WHERE i."id" = dup."id";--> statement-breakpoint

CREATE INDEX "thesis_theme_idx" ON "Thesis" USING btree ("themeId");--> statement-breakpoint
CREATE UNIQUE INDEX "thesis_active_theme_unique_idx" ON "Thesis" USING btree ("themeId") WHERE "isActive" = true;--> statement-breakpoint

CREATE INDEX "industry_intel_theme_idx" ON "IndustryIntelligence" USING btree ("themeId");--> statement-breakpoint
CREATE UNIQUE INDEX "industry_intel_active_theme_unique_idx" ON "IndustryIntelligence" USING btree ("themeId") WHERE "isActive" = true;--> statement-breakpoint

CREATE TABLE "ThemeCompanyCoverage" (
  "id" text PRIMARY KEY NOT NULL,
  "themeId" text NOT NULL,
  "companyId" text NOT NULL,
  "coverageStatus" "CompanyCoverageStatus" DEFAULT 'UNCONTACTED' NOT NULL,
  "lastOutreachAt" timestamp,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "ThemeCompanyCoverage"
  ADD CONSTRAINT "ThemeCompanyCoverage_themeId_Theme_id_fk"
  FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "ThemeCompanyCoverage"
  ADD CONSTRAINT "ThemeCompanyCoverage_companyId_Company_id_fk"
  FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "theme_company_coverage_theme_idx" ON "ThemeCompanyCoverage" USING btree ("themeId");--> statement-breakpoint
CREATE INDEX "theme_company_coverage_company_idx" ON "ThemeCompanyCoverage" USING btree ("companyId");--> statement-breakpoint
CREATE UNIQUE INDEX "theme_company_coverage_unique_idx" ON "ThemeCompanyCoverage" USING btree ("themeId","companyId");
