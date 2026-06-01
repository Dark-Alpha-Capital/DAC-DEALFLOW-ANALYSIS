import type { AppDb } from "@repo/db";
import { and, asc, eq, inArray, sql } from "@repo/db";
import type { InferInsertModel } from "drizzle-orm";
import { documentChunks, type DocumentChunk } from "@repo/db/schema";
import { EMBEDDING_DIMENSION, type ProcessedChunk } from "@repo/rag-engine";

const UPSERT_BATCH = 100;

type DocumentChunkInsert = InferInsertModel<typeof documentChunks>;

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

function embeddingToVector(embedding: number[]): ReturnType<typeof sql.raw> {
  return sql.raw(`'[${embedding.join(",")}]'::vector`);
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
  for (let i = 0; i < chunks.length; i += UPSERT_BATCH) {
    const slice = chunks.slice(i, i + UPSERT_BATCH);
    for (const c of slice) {
      const values = c.embedding;
      if (!values || values.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `pgvector upsert: chunk ${c.row.id} has invalid embedding length ${values?.length ?? 0} (expected ${EMBEDDING_DIMENSION})`,
        );
      }
      if (!hasFiniteEmbeddingValues(values)) {
        throw new Error(
          `pgvector upsert: chunk ${c.row.id} has non-finite embedding values`,
        );
      }
      const metadata = vectorizeMetadataFromChunkRow(c.row);
      try {
        await d.execute(sql`
          INSERT INTO "DocumentChunkVector" ("id", "namespace", "embedding", "metadata")
          VALUES (${String(c.row.id)}, ${c.row.documentId}, ${embeddingToVector(values)}, ${JSON.stringify(metadata)}::jsonb)
          ON CONFLICT ("id") DO UPDATE SET "embedding" = EXCLUDED."embedding", "metadata" = EXCLUDED."metadata"
        `);
      } catch (err) {
        console.warn("[pgvector-upsert] Failed for chunk", {
          chunkId: c.row.id,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }
  }
}

export async function deleteChunkVectorsForDocument(
  db: AppDb,
  _index: unknown,
  documentId: string,
): Promise<void> {
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

function buildMetaFilter(
  input: SearchDocumentChunksVectorInput,
): ReturnType<typeof sql>[] {
  const conditions: ReturnType<typeof sql>[] = [];
  if (input.entityType) {
    conditions.push(sql`"metadata"->>'entityType' = ${input.entityType}`);
  }
  if (input.entityId != null && input.entityId !== "") {
    conditions.push(sql`"metadata"->>'entityId' = ${String(input.entityId)}`);
  }
  if (input.dealOpportunityId != null && input.dealOpportunityId !== "") {
    conditions.push(sql`"metadata"->>'dealOpportunityId' = ${String(input.dealOpportunityId)}`);
  }
  if (input.companyId != null && input.companyId !== "") {
    conditions.push(sql`"metadata"->>'companyId' = ${String(input.companyId)}`);
  }
  if (input.themeId != null && input.themeId !== "") {
    conditions.push(sql`"metadata"->>'themeId' = ${String(input.themeId)}`);
  }
  return conditions;
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
      `pgvector query: expected embedding length ${EMBEDDING_DIMENSION}, got ${queryEmbedding.length}`,
    );
  }

  const vec = embeddingToVector(queryEmbedding);
  const topK = Math.min(limit, 100);

  const conditions: ReturnType<typeof sql>[] = [];

  if (input.documentId) {
    conditions.push(sql`"namespace" = ${input.documentId}`);
  }

  const metaConds = buildMetaFilter(input);
  conditions.push(...metaConds);

  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  const result = await db.execute(sql`
    SELECT "id" FROM "DocumentChunkVector"
    ${whereClause}
    ORDER BY "embedding" <=> ${vec}
    LIMIT ${topK}
  `);

  const rows = (result as any).rows ?? result;
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const ids: string[] = rows.map((r: any) => String(r.id));

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
