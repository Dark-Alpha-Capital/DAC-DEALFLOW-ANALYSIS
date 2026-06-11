CREATE TABLE "LeadScreening" (
	"id" text PRIMARY KEY NOT NULL,
	"leadId" text NOT NULL,
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
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "LeadScreening" ADD CONSTRAINT "LeadScreening_leadId_Lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_screening_lead_unique_idx" ON "LeadScreening" USING btree ("leadId");--> statement-breakpoint
CREATE INDEX "lead_screening_status_idx" ON "LeadScreening" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lead_screening_score_idx" ON "LeadScreening" USING btree ("score");