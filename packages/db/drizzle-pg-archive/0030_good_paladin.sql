CREATE TABLE "SimScreeningRun" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"screenerId" text NOT NULL,
	"workflowInstanceId" text,
	"status" "SimScreeningSessionStatus" DEFAULT 'PENDING' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SimScreeningRun" ADD CONSTRAINT "SimScreeningRun_sessionId_SimScreeningSession_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."SimScreeningSession"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "SimScreeningRun" ADD CONSTRAINT "SimScreeningRun_screenerId_ScreenerTemplate_id_fk" FOREIGN KEY ("screenerId") REFERENCES "public"."ScreenerTemplate"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sim_screening_run_session_idx" ON "SimScreeningRun" USING btree ("sessionId");
--> statement-breakpoint
INSERT INTO "SimScreeningRun" ("id", "sessionId", "screenerId", "workflowInstanceId", "status", "errorMessage", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "screenerId", "workflowInstanceId", "status", "errorMessage", "createdAt", "updatedAt"
FROM "SimScreeningSession";
--> statement-breakpoint
ALTER TABLE "SimScreeningAnswer" ADD COLUMN "runId" text;
--> statement-breakpoint
UPDATE "SimScreeningAnswer" AS a
SET "runId" = r."id"
FROM "SimScreeningRun" AS r
WHERE r."sessionId" = a."sessionId";
--> statement-breakpoint
ALTER TABLE "SimScreeningAnswer" ALTER COLUMN "runId" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "SimScreeningAnswer" DROP CONSTRAINT "SimScreeningAnswer_sessionId_SimScreeningSession_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "sim_screening_answer_session_question_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "sim_screening_answer_session_idx";
--> statement-breakpoint
ALTER TABLE "SimScreeningAnswer" DROP COLUMN "sessionId";
--> statement-breakpoint
ALTER TABLE "SimScreeningAnswer" ADD CONSTRAINT "SimScreeningAnswer_runId_SimScreeningRun_id_fk" FOREIGN KEY ("runId") REFERENCES "public"."SimScreeningRun"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "sim_screening_answer_run_question_unique" ON "SimScreeningAnswer" USING btree ("runId","questionId");
--> statement-breakpoint
CREATE INDEX "sim_screening_answer_run_idx" ON "SimScreeningAnswer" USING btree ("runId");
--> statement-breakpoint
ALTER TABLE "SimScreeningSession" DROP CONSTRAINT "SimScreeningSession_screenerId_ScreenerTemplate_id_fk";
--> statement-breakpoint
ALTER TABLE "SimScreeningSession" DROP COLUMN "screenerId";
--> statement-breakpoint
ALTER TABLE "SimScreeningSession" DROP COLUMN "workflowInstanceId";
--> statement-breakpoint
ALTER TABLE "SimScreeningSession" DROP COLUMN "status";
--> statement-breakpoint
ALTER TABLE "SimScreeningSession" DROP COLUMN "errorMessage";
