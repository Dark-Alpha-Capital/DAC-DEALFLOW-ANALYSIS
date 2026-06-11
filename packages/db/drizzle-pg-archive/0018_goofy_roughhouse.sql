CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."DocumentChunkModality" AS ENUM('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'PDF');--> statement-breakpoint
CREATE TYPE "public"."DocumentIngestionStatus" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TABLE "DocumentChunk" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"entityType" "DocumentEntityType" NOT NULL,
	"entityId" text,
	"dealOpportunityId" text,
	"companyId" text,
	"themeId" text,
	"chunkText" text,
	"modality" "DocumentChunkModality" DEFAULT 'TEXT' NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb,
	"pageNumber" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "ingestionStatus" "DocumentIngestionStatus" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "ingestionStartedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "ingestionCompletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "ingestionAttemptCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "ingestionError" text;--> statement-breakpoint
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_Document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_dealOpportunityId_DealOpportunity_id_fk" FOREIGN KEY ("dealOpportunityId") REFERENCES "public"."DealOpportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_themeId_Theme_id_fk" FOREIGN KEY ("themeId") REFERENCES "public"."Theme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_chunk_document_idx" ON "DocumentChunk" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "document_chunk_entity_idx" ON "DocumentChunk" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "document_chunk_deal_opp_idx" ON "DocumentChunk" USING btree ("dealOpportunityId");--> statement-breakpoint
CREATE INDEX "document_chunk_company_idx" ON "DocumentChunk" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "document_chunk_theme_idx" ON "DocumentChunk" USING btree ("themeId");--> statement-breakpoint
CREATE INDEX "document_chunk_embedding_cosine_idx" ON "DocumentChunk" USING hnsw ("embedding" vector_cosine_ops) WHERE "embedding" IS NOT NULL;
