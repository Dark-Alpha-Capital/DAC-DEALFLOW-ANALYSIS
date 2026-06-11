CREATE TYPE "public"."SimScreeningSessionStatus" AS ENUM('PENDING', 'INGESTING', 'SCREENING', 'COMPLETED', 'FAILED');--> statement-breakpoint
ALTER TYPE "public"."DocumentCategory" ADD VALUE 'SIM_SCREENING';--> statement-breakpoint
CREATE TABLE "SimScreeningAnswer" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"questionId" text NOT NULL,
	"score" integer NOT NULL,
	"rationale" text NOT NULL,
	"evidenceChunkIds" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SimScreeningSession" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"documentId" text NOT NULL,
	"screenerId" text NOT NULL,
	"workflowInstanceId" text,
	"status" "SimScreeningSessionStatus" DEFAULT 'PENDING' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SimScreeningAnswer" ADD CONSTRAINT "SimScreeningAnswer_sessionId_SimScreeningSession_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."SimScreeningSession"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SimScreeningAnswer" ADD CONSTRAINT "SimScreeningAnswer_questionId_ScreenerQuestion_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."ScreenerQuestion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SimScreeningSession" ADD CONSTRAINT "SimScreeningSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SimScreeningSession" ADD CONSTRAINT "SimScreeningSession_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SimScreeningSession" ADD CONSTRAINT "SimScreeningSession_screenerId_ScreenerTemplate_id_fk" FOREIGN KEY ("screenerId") REFERENCES "public"."ScreenerTemplate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sim_screening_answer_session_question_unique" ON "SimScreeningAnswer" USING btree ("sessionId","questionId");--> statement-breakpoint
CREATE INDEX "sim_screening_answer_session_idx" ON "SimScreeningAnswer" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "sim_screening_session_user_idx" ON "SimScreeningSession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sim_screening_session_document_idx" ON "SimScreeningSession" USING btree ("documentId");