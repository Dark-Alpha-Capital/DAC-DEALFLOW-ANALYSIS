CREATE TYPE "public"."IcScorerMode" AS ENUM('rag', 'monograph');--> statement-breakpoint
CREATE TYPE "public"."IcScorerRunStatus" AS ENUM('PENDING', 'SCORING', 'MEMO', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "IcScorerRun" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"dealOpportunityId" text NOT NULL,
	"bitrixDealId" text,
	"mode" "IcScorerMode" NOT NULL,
	"targetDocumentId" text,
	"status" "IcScorerRunStatus" DEFAULT 'PENDING' NOT NULL,
	"errorMessage" text,
	"scoreWorkflowInstanceId" text,
	"memoWorkflowInstanceId" text,
	"scorePayload" jsonb,
	"output" jsonb,
	"dealDocumentsSnapshot" jsonb,
	"evidenceChunkIds" jsonb,
	"promptVersion" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "IcScorerRun" ADD CONSTRAINT "IcScorerRun_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "IcScorerRun" ADD CONSTRAINT "IcScorerRun_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "IcScorerRun" ADD CONSTRAINT "IcScorerRun_targetDocumentId_Document_id_fk" FOREIGN KEY ("targetDocumentId") REFERENCES "public"."Document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ic_scorer_run_deal_opp_idx" ON "IcScorerRun" USING btree ("dealOpportunityId","createdAt");--> statement-breakpoint
CREATE INDEX "ic_scorer_run_user_idx" ON "IcScorerRun" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ic_scorer_run_bitrix_deal_idx" ON "IcScorerRun" USING btree ("bitrixDealId");