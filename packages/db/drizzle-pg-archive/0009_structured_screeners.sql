CREATE TYPE "public"."ScreenerResponseType" AS ENUM('SCORE');--> statement-breakpoint
CREATE TYPE "public"."ScreenerResponseSource" AS ENUM('AI', 'HUMAN');--> statement-breakpoint

ALTER TABLE "AiScreening" DROP CONSTRAINT "AiScreening_screenerId_Screener_id_fk";--> statement-breakpoint

ALTER TABLE "Screener" RENAME TO "ScreenerTemplate";--> statement-breakpoint
ALTER TABLE "ScreenerTemplate" ADD COLUMN "category" text DEFAULT 'General' NOT NULL;--> statement-breakpoint
ALTER TABLE "ScreenerTemplate" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "ScreenerTemplate" DROP COLUMN "fileUrl";--> statement-breakpoint

CREATE TABLE "ScreenerQuestion" (
	"id" text PRIMARY KEY NOT NULL,
	"screenerId" text NOT NULL,
	"question" text NOT NULL,
	"weight" integer DEFAULT 10 NOT NULL,
	"responseType" "ScreenerResponseType" DEFAULT 'SCORE' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "ScreenerResponse" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"questionId" text NOT NULL,
	"score" integer NOT NULL,
	"source" "ScreenerResponseSource" NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "ScreenerQuestion" ADD CONSTRAINT "ScreenerQuestion_screenerId_ScreenerTemplate_id_fk" FOREIGN KEY ("screenerId") REFERENCES "public"."ScreenerTemplate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ScreenerResponse" ADD CONSTRAINT "ScreenerResponse_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ScreenerResponse" ADD CONSTRAINT "ScreenerResponse_questionId_ScreenerQuestion_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."ScreenerQuestion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AiScreening" ADD CONSTRAINT "AiScreening_screenerId_ScreenerTemplate_id_fk" FOREIGN KEY ("screenerId") REFERENCES "public"."ScreenerTemplate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "screener_template_category_idx" ON "ScreenerTemplate" USING btree ("category");--> statement-breakpoint
CREATE INDEX "screener_template_name_idx" ON "ScreenerTemplate" USING btree ("name");--> statement-breakpoint
CREATE INDEX "screener_question_screener_idx" ON "ScreenerQuestion" USING btree ("screenerId");--> statement-breakpoint
CREATE UNIQUE INDEX "screener_question_order_unique_idx" ON "ScreenerQuestion" USING btree ("screenerId","position");--> statement-breakpoint
CREATE INDEX "screener_response_deal_opp_idx" ON "ScreenerResponse" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "screener_response_question_idx" ON "ScreenerResponse" USING btree ("questionId");--> statement-breakpoint
CREATE UNIQUE INDEX "screener_response_unique_idx" ON "ScreenerResponse" USING btree ("dealOpportunityId","questionId","source");--> statement-breakpoint
