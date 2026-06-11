CREATE TABLE IF NOT EXISTS "WorkflowJob" (
	"instanceId" text PRIMARY KEY NOT NULL,
	"workflowKind" text NOT NULL,
	"userId" text NOT NULL,
	"dealId" text,
	"fileName" text,
	"screenerId" text,
	"progressStep" text,
	"progressPercent" integer DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'waiting' NOT NULL,
	"failedReason" text,
	"returnValue" jsonb,
	"attemptsMade" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WorkflowJob" ADD CONSTRAINT "WorkflowJob_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_job_user_created_idx" ON "WorkflowJob" USING btree ("userId","createdAt");
