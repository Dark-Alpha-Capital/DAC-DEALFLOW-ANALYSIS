-- Add DealSim table and link CIM extractions to SIMs (one active per deal)

-- 1. Create enums
DO $$ BEGIN
  CREATE TYPE "public"."DealSimStatus" AS ENUM('ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."CIMExtractionSource" AS ENUM('AI', 'USER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create DealSim table
CREATE TABLE IF NOT EXISTS "DealSim" (
  "id" text PRIMARY KEY NOT NULL,
  "dealOpportunityId" text NOT NULL REFERENCES "DealOpportunity"("id") ON DELETE CASCADE,
  "documentId" text NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "storageKey" text NOT NULL,
  "status" "DealSimStatus" DEFAULT 'ACTIVE' NOT NULL,
  "uploadedById" text REFERENCES "User"("id"),
  "uploadedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "deal_sim_deal_opp_idx" ON "DealSim" ("dealOpportunityId");
CREATE UNIQUE INDEX IF NOT EXISTS "deal_sim_active_unique_idx"
  ON "DealSim" ("dealOpportunityId")
  WHERE "status" = 'ACTIVE';

-- 3. Add new columns to CIMExtraction (nullable for migration)
ALTER TABLE "CIMExtraction" ADD COLUMN IF NOT EXISTS "simId" text REFERENCES "DealSim"("id") ON DELETE CASCADE;
ALTER TABLE "CIMExtraction" ADD COLUMN IF NOT EXISTS "source" "CIMExtractionSource" DEFAULT 'AI' NOT NULL;
ALTER TABLE "CIMExtraction" ADD COLUMN IF NOT EXISTS "updatedByUserId" text REFERENCES "User"("id");

-- 4. Backfill: create DealSim for each existing CIMExtraction, then set simId
WITH new_sims AS (
  INSERT INTO "DealSim" ("id", "dealOpportunityId", "documentId", "storageKey", "status", "uploadedById", "uploadedAt")
  SELECT
    gen_random_uuid()::text,
    c."dealOpportunityId",
    c."documentId",
    COALESCE(
      regexp_replace(d."fileUrl", '^.*/remote\.php/dav/files/[^/]+/', ''),
      'legacy/' || d."fileName"
    ),
    'ACTIVE',
    d."uploadedById",
    COALESCE(d."createdAt", now())
  FROM "CIMExtraction" c
  JOIN "Document" d ON d."id" = c."documentId"
  WHERE c."simId" IS NULL
  RETURNING "id", "documentId", "dealOpportunityId"
)
UPDATE "CIMExtraction" c
SET "simId" = ns."id"
FROM new_sims ns
WHERE c."documentId" = ns."documentId"
  AND c."dealOpportunityId" = ns."dealOpportunityId";

-- 5. Drop old unique index
DROP INDEX IF EXISTS "cim_extraction_deal_opp_unique_idx";

-- 6. Make documentId and dealOpportunityId nullable (denormalized)
ALTER TABLE "CIMExtraction" ALTER COLUMN "documentId" DROP NOT NULL;
ALTER TABLE "CIMExtraction" ALTER COLUMN "dealOpportunityId" DROP NOT NULL;

-- 7. Add new indexes
CREATE INDEX IF NOT EXISTS "cim_extraction_sim_idx" ON "CIMExtraction" ("simId");
CREATE UNIQUE INDEX IF NOT EXISTS "cim_extraction_sim_unique_idx" ON "CIMExtraction" ("simId") WHERE "simId" IS NOT NULL;
