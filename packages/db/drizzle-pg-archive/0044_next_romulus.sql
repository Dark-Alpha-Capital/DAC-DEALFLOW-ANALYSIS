ALTER TABLE "CimScreeningSession" DROP CONSTRAINT "CimScreeningSession_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "IcScorerRun" DROP CONSTRAINT "IcScorerRun_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "WorkflowJob" DROP CONSTRAINT "WorkflowJob_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "CimScreeningSession" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "IcScorerRun" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "WorkflowJob" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "CimScreeningSession" ADD CONSTRAINT "CimScreeningSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "IcScorerRun" ADD CONSTRAINT "IcScorerRun_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WorkflowJob" ADD CONSTRAINT "WorkflowJob_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;