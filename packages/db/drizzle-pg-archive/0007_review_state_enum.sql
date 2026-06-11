DO $$ BEGIN
 CREATE TYPE "ReviewState" AS ENUM('NOT_SEEN', 'SEEN', 'REVIEWED', 'PUBLISHED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "Deal" ADD COLUMN "reviewState" "ReviewState" DEFAULT 'NOT_SEEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ADD COLUMN "reviewState" "ReviewState" DEFAULT 'NOT_SEEN' NOT NULL;--> statement-breakpoint
UPDATE "Deal" SET "reviewState" = CASE
  WHEN "isPublished" = true THEN 'PUBLISHED'::"ReviewState"
  WHEN "isReviewed" = true THEN 'REVIEWED'::"ReviewState"
  WHEN "seen" = true THEN 'SEEN'::"ReviewState"
  ELSE 'NOT_SEEN'::"ReviewState"
END;--> statement-breakpoint
UPDATE "DealOpportunity" SET "reviewState" = CASE
  WHEN "isPublished" = true THEN 'PUBLISHED'::"ReviewState"
  WHEN "isReviewed" = true THEN 'REVIEWED'::"ReviewState"
  WHEN "seen" = true THEN 'SEEN'::"ReviewState"
  ELSE 'NOT_SEEN'::"ReviewState"
END;--> statement-breakpoint
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "isPublished";--> statement-breakpoint
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "isReviewed";--> statement-breakpoint
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "seen";--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP COLUMN IF EXISTS "isPublished";--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP COLUMN IF EXISTS "isReviewed";--> statement-breakpoint
ALTER TABLE "DealOpportunity" DROP COLUMN IF EXISTS "seen";
