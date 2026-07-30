import type { AppDb } from "@repo/db";
import { and, asc, eq, inArray, sql } from "@repo/db";
import type { InferInsertModel } from "drizzle-orm";
import { documentChunks, type DocumentChunk } from "@repo/db/schema";
import { EMBEDDING_DIMENSION, type ProcessedChunk } from "@repo/rag-engine";

const UPSERT_BATCH = 100;

type DocumentChunkInsert = InferInsertModel<typeof documentChunks>;

let localVectorTableReady = false;

async function ensureLocalVectorTable(db: AppDb): Promise<void> {
  if (localVectorTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "DocumentChunkVector" (
      "id" TEXT PRIMARY KEY,
      "namespace" TEXT NOT NULL DEFAULT '',
      "embedding" TEXT NOT NULL,
      "metadata" TEXT NOT NULL DEFAULT '{}'
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS document_chunk_vector_namespace_idx
    ON "DocumentChunkVector" ("namespace")
  `);
  localVectorTableReady = true;
}

export function vectorizeMetadataFromChunkRow(
  row: DocumentChunkInsert,
): Record<string, string> {
  const entityType =
    typeof row.entityType === "string"
      ? row.entityType
      : String(row.entityType);
  return {
    documentId: String(row.documentId),
    entityType,
    entityId: row.entityId != null ? String(row.entityId) : "",
    dealOpportunityId:
      row.dealOpportunityId != null ? String(row.dealOpportunityId) : "",
    companyId: row.companyId != null ? String(row.companyId) : "",
    themeId: row.themeId != null ? String(row.themeId) : "",
  };
}

function hasFiniteEmbeddingValues(values: number[]): boolean {
  for (const value of values) {
    if (!Number.isFinite(value)) return false;
  }
  return true;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getDb(userProvided?: AppDb): Promise<AppDb> {
  if (userProvided) return userProvided;
  return (await import("@repo/db")).default as AppDb;
}

export async function upsertDocumentChunkVectors(
  _index: unknown,
  chunks: ProcessedChunk[],
  db?: AppDb,
): Promise<void> {
  const d = await getDb(db);
  await ensureLocalVectorTable(d);
  for (let i = 0; i < chunks.length; i += UPSERT_BATCH) {
    const slice = chunks.slice(i, i + UPSERT_BATCH);
    for (const c of slice) {
      const values = c.embedding;
      if (!values || values.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `local vector upsert: chunk ${c.row.id} has invalid embedding length ${values?.length ?? 0} (expected ${EMBEDDING_DIMENSION})`,
        );
      }
      if (!hasFiniteEmbeddingValues(values)) {
        throw new Error(
          `local vector upsert: chunk ${c.row.id} has non-finite embedding values`,
        );
      }
      const metadata = vectorizeMetadataFromChunkRow(c.row);
      const embeddingJson = JSON.stringify(values);
      await d.execute(sql`
        INSERT INTO "DocumentChunkVector" ("id", "namespace", "embedding", "metadata")
        VALUES (${String(c.row.id)}, ${c.row.documentId}, ${embeddingJson}, ${JSON.stringify(metadata)})
        ON CONFLICT ("id") DO UPDATE SET
          "embedding" = excluded."embedding",
          "metadata" = excluded."metadata"
      `);
    }
  }
}

export async function deleteChunkVectorsForDocument(
  db: AppDb,
  _index: unknown,
  documentId: string,
): Promise<void> {
  await ensureLocalVectorTable(db);
  await db.execute(
    sql`DELETE FROM "DocumentChunkVector" WHERE "namespace" = ${documentId}`,
  );
}

export interface SearchDocumentChunksVectorInput {
  queryEmbedding: number[];
  limit?: number;
  entityType?: "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY" | "THEME" | "GLOBAL";
  entityId?: string | null;
  documentId?: string;
  dealOpportunityId?: string;
  companyId?: string;
  themeId?: string;
}

function metadataMatches(
  metadata: Record<string, string>,
  input: SearchDocumentChunksVectorInput,
): boolean {
  if (input.entityType && metadata.entityType !== input.entityType) return false;
  if (input.entityId != null && input.entityId !== "" && metadata.entityId !== String(input.entityId)) {
    return false;
  }
  if (
    input.dealOpportunityId != null &&
    input.dealOpportunityId !== "" &&
    metadata.dealOpportunityId !== String(input.dealOpportunityId)
  ) {
    return false;
  }
  if (input.companyId != null && input.companyId !== "" && metadata.companyId !== String(input.companyId)) {
    return false;
  }
  if (input.themeId != null && input.themeId !== "" && metadata.themeId !== String(input.themeId)) {
    return false;
  }
  return true;
}

export function buildVectorizeFilter(
  input: SearchDocumentChunksVectorInput,
): Record<string, string> {
  const f: Record<string, string> = {};
  if (input.entityType) f.entityType = input.entityType;
  if (input.entityId !== undefined) f.entityId = input.entityId ?? "";
  if (input.documentId) f.documentId = input.documentId;
  if (input.dealOpportunityId !== undefined) f.dealOpportunityId = input.dealOpportunityId;
  if (input.companyId !== undefined) f.companyId = input.companyId;
  if (input.themeId !== undefined) f.themeId = input.themeId;
  return f;
}

export async function searchDocumentChunksVector(
  db: AppDb,
  _index: unknown,
  input: SearchDocumentChunksVectorInput,
): Promise<DocumentChunk[]> {
  const { queryEmbedding, limit = 10 } = input;
  if (!queryEmbedding.length) return [];
  if (queryEmbedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `local vector query: expected embedding length ${EMBEDDING_DIMENSION}, got ${queryEmbedding.length}`,
    );
  }

  await ensureLocalVectorTable(db);
  const topK = Math.min(limit, 100);

  const result = await db.execute(sql`
    SELECT "id", "namespace", "embedding", "metadata"
    FROM "DocumentChunkVector"
    ${input.documentId ? sql`WHERE "namespace" = ${input.documentId}` : sql``}
  `);

  const rows = (result as { rows?: unknown[] }).rows ?? result;
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const scored: { id: string; score: number }[] = [];
  for (const row of rows as Array<{
    id: string;
    embedding: string;
    metadata: string;
  }>) {
    let metadata: Record<string, string> = {};
    try {
      metadata = JSON.parse(row.metadata) as Record<string, string>;
    } catch {
      continue;
    }
    if (!metadataMatches(metadata, input)) continue;

    let embedding: number[];
    try {
      embedding = JSON.parse(row.embedding) as number[];
    } catch {
      continue;
    }
    if (embedding.length !== EMBEDDING_DIMENSION) continue;

    scored.push({
      id: String(row.id),
      score: cosineSimilarity(queryEmbedding, embedding),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const ids = scored.slice(0, topK).map((s) => s.id);
  if (ids.length === 0) return [];

  const chunkRows = await db
    .select()
    .from(documentChunks)
    .where(inArray(documentChunks.id, ids));

  const byId = new Map(chunkRows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is DocumentChunk => r !== undefined);
}

export async function listDealOpportunityScreeningChunks(
  db: AppDb,
  dealOpportunityId: string,
  limit: number,
  documentIds?: string[],
): Promise<DocumentChunk[]> {
  const cap = Math.min(Math.max(1, limit), 100);
  const parts = [eq(documentChunks.dealOpportunityId, dealOpportunityId)];
  if (documentIds?.length) {
    parts.push(inArray(documentChunks.documentId, documentIds));
  }
  const whereExpr = parts.length === 1 ? parts[0]! : and(...parts);
  return db
    .select()
    .from(documentChunks)
    .where(whereExpr)
    .orderBy(asc(documentChunks.documentId), asc(documentChunks.createdAt))
    .limit(cap);
}

export function getDocumentChunksVectorIndex(): unknown {
  return {};
}
