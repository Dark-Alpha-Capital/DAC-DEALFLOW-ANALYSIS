ALTER TABLE "DealOpportunity" ALTER COLUMN "stage" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "DealOpportunity" ALTER COLUMN "stage" SET DEFAULT 'NEW';--> statement-breakpoint
CREATE UNIQUE INDEX "deal_opp_bitrix_id_unique_idx" ON "DealOpportunity" USING btree ("bitrixId") WHERE "DealOpportunity"."bitrixId" is not null;--> statement-breakpoint
DROP TYPE "public"."DealStage";