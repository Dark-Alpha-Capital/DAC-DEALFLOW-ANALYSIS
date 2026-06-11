CREATE TABLE "CompanyNote" (
	"id" text PRIMARY KEY NOT NULL,
	"companyId" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"createdById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CompanyNote" ADD CONSTRAINT "CompanyNote_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CompanyNote" ADD CONSTRAINT "CompanyNote_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_notes_company_idx" ON "CompanyNote" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "company_notes_created_at_idx" ON "CompanyNote" USING btree ("createdAt");--> statement-breakpoint
ALTER TABLE "Company" DROP COLUMN "notes";