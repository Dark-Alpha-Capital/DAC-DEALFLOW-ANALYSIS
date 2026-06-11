CREATE TYPE "public"."Department" AS ENUM('Capital Markets', 'Deal Team', 'Legal and Compliance', 'Operations', 'M&A Origination', 'Technology', 'Investor Relations', 'Public Markets/Hedge Fund', 'Investment Team', 'Due Diligence', 'Talent Acquisition', 'Operating Partner');--> statement-breakpoint
CREATE TYPE "public"."ProjectKickoffScreeningStatus" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ProjectTrackerSourceType" AS ENUM('PROJECT_KICKOFF');--> statement-breakpoint
CREATE TABLE "ProjectKickoff" (
	"id" text PRIMARY KEY NOT NULL,
	"projectName" text NOT NULL,
	"department" "Department",
	"projectOwners" text,
	"productDirection" text,
	"engineeringLead" text,
	"objectives" text NOT NULL,
	"platformEnables" text,
	"keyDeliverables" text,
	"risksAndBlockers" text,
	"raciMatrix" text,
	"timeline" text,
	"chosenTool" text,
	"techStack" text,
	"definitionOfDone" text,
	"additionalNotes" text,
	"rawText" text,
	"structuredData" jsonb,
	"userId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProjectKickoffScreening" (
	"id" text PRIMARY KEY NOT NULL,
	"kickoffId" text NOT NULL,
	"workflowInstanceId" text,
	"status" "ProjectKickoffScreeningStatus" DEFAULT 'pending' NOT NULL,
	"score" double precision,
	"analysis" text,
	"screenedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProjectTracker" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sourceType" "ProjectTrackerSourceType" DEFAULT 'PROJECT_KICKOFF' NOT NULL,
	"kickoffId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" text
);
--> statement-breakpoint
ALTER TABLE "ProjectKickoff" ADD CONSTRAINT "ProjectKickoff_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProjectKickoffScreening" ADD CONSTRAINT "ProjectKickoffScreening_kickoffId_ProjectKickoff_id_fk" FOREIGN KEY ("kickoffId") REFERENCES "public"."ProjectKickoff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProjectKickoffScreening" ADD CONSTRAINT "ProjectKickoffScreening_workflowInstanceId_WorkflowJob_instanceId_fk" FOREIGN KEY ("workflowInstanceId") REFERENCES "public"."WorkflowJob"("instanceId") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProjectTracker" ADD CONSTRAINT "ProjectTracker_kickoffId_ProjectKickoff_id_fk" FOREIGN KEY ("kickoffId") REFERENCES "public"."ProjectKickoff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProjectTracker" ADD CONSTRAINT "ProjectTracker_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_kickoff_user_created_idx" ON "ProjectKickoff" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "project_kickoff_screening_kickoff_created_idx" ON "ProjectKickoffScreening" USING btree ("kickoffId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "project_kickoff_screening_workflow_unique_idx" ON "ProjectKickoffScreening" USING btree ("workflowInstanceId");--> statement-breakpoint
CREATE UNIQUE INDEX "project_tracker_kickoff_unique_idx" ON "ProjectTracker" USING btree ("kickoffId");
