CREATE TABLE "DealOpportunityTheme" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"themeId" text NOT NULL,
	"isPrimary" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DealOpportunityTheme" ADD CONSTRAINT "DealOpportunityTheme_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DealOpportunityTheme" ADD CONSTRAINT "DealOpportunityTheme_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deal_opp_theme_unique_idx" ON "DealOpportunityTheme" USING btree ("dealOpportunityId","themeId");--> statement-breakpoint
CREATE INDEX "deal_opp_theme_deal_idx" ON "DealOpportunityTheme" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "deal_opp_theme_theme_idx" ON "DealOpportunityTheme" USING btree ("themeId");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_opp_primary_theme_unique_idx" ON "DealOpportunityTheme" USING btree ("dealOpportunityId") WHERE "DealOpportunityTheme"."isPrimary" = true;--> statement-breakpoint
INSERT INTO "DealOpportunityTheme" ("id", "dealOpportunityId", "themeId", "isPrimary", "createdAt")
SELECT
  concat('backfill_', d."id"),
  d."id",
  c."themeId",
  true,
  now()
FROM "DealOpportunity" d
INNER JOIN "Company" c ON c."id" = d."companyId"
WHERE c."themeId" IS NOT NULL
ON CONFLICT ("dealOpportunityId", "themeId") DO NOTHING;