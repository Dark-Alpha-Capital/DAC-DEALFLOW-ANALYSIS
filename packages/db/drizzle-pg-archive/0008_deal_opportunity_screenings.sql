DO $$ BEGIN
 CREATE TYPE "DealScreeningStatus" AS ENUM('PASS', 'FAIL', 'INCOMPLETE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "DealOpportunityScreening" (
  "id" text PRIMARY KEY NOT NULL,
  "dealOpportunityId" text NOT NULL,
  "status" "DealScreeningStatus" NOT NULL,
  "passed" boolean DEFAULT false NOT NULL,
  "reasons" text[] DEFAULT '{}' NOT NULL,
  "score" integer,
  "ebitdaFitScore" integer,
  "revenueScore" integer,
  "industryScore" integer,
  "profileKey" text NOT NULL,
  "profileVersion" text NOT NULL,
  "screenedAt" timestamp DEFAULT now() NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "deal_opp_screening_deal_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "deal_opp_screening_deal_unique_idx" ON "DealOpportunityScreening" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deal_opp_screening_status_idx" ON "DealOpportunityScreening" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deal_opp_screening_score_idx" ON "DealOpportunityScreening" USING btree ("score");
