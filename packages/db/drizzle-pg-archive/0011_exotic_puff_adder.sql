CREATE TABLE "CIMExtractionDebug" (
	"id" text PRIMARY KEY NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CIMExtractionLog" (
	"id" text PRIMARY KEY NOT NULL,
	"dealOpportunityId" text,
	"message" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CIMExtraction" ADD COLUMN "debugNote" text;