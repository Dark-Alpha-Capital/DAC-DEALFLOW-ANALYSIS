CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "DocumentChunkVector" (
  "id" TEXT PRIMARY KEY,
  "namespace" TEXT NOT NULL DEFAULT '',
  "embedding" vector(768) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_chunk_vector_namespace_idx
  ON "DocumentChunkVector" ("namespace");

CREATE INDEX IF NOT EXISTS document_chunk_vector_embedding_idx
  ON "DocumentChunkVector"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
