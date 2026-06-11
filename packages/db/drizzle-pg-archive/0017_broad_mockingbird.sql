ALTER TYPE "public"."DocumentCategory" ADD VALUE 'OPERATING_PLAYBOOK';--> statement-breakpoint
ALTER TYPE "public"."DocumentCategory" ADD VALUE 'INVESTMENT_MEMO';--> statement-breakpoint
ALTER TYPE "public"."DocumentCategory" ADD VALUE 'IC_TEMPLATE';--> statement-breakpoint
ALTER TYPE "public"."DocumentCategory" ADD VALUE 'INDUSTRY_RESEARCH';--> statement-breakpoint
ALTER TYPE "public"."DocumentCategory" ADD VALUE 'VALUE_CREATION_PLAYBOOK';--> statement-breakpoint
ALTER TYPE "public"."DocumentCategory" ADD VALUE 'PAST_DEAL_ANALYSIS';--> statement-breakpoint
ALTER TYPE "public"."DocumentCategory" ADD VALUE 'DUE_DILIGENCE_CHECKLIST';--> statement-breakpoint
ALTER TYPE "public"."DocumentEntityType" ADD VALUE 'THEME';--> statement-breakpoint
ALTER TYPE "public"."DocumentEntityType" ADD VALUE 'GLOBAL';--> statement-breakpoint
ALTER TABLE "Document" ALTER COLUMN "entityId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "themeId" text;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE cascade ON UPDATE no action;