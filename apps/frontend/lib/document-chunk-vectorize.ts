import { env } from "cloudflare:workers";
import type { AppDb } from "@repo/db";
import { eq, inArray } from "@repo/db";
import type { InferInsertModel } from "drizzle-orm";
import { documentChunks, type DocumentChunk } from "@repo/db/schema";
import type { ProcessedChunk } from "@repo/rag-engine";

const UPSERT_BATCH = 100;
const DELETE_ID_BATCH = 500;

type DocumentChunkInsert = InferInsertModel<typeof documentChunks>;

/** Metadata for Vectorize filters; nullable FKs use "" (matches SQL NULL chunks). */
export function vectorizeMetadataFromChunkRow(
  row: DocumentChunkInsert,
): Record<string, string> {
  return {
    documentId: row.documentId,
    entityType: row.entityType,
    entityId: row.entityId ?? "",
    dealOpportunityId: row.dealOpportunityId ?? "",
    companyId: row.companyId ?? "",
    themeId: row.themeId ?? "",
  };
}

export async function upsertDocumentChunkVectors(
  index: VectorizeIndex,
  chunks: ProcessedChunk[],
): Promise<void> {
  for (let i = 0; i < chunks.length; i += UPSERT_BATCH) {
    const slice = chunks.slice(i, i + UPSERT_BATCH);
    await index.upsert(
      slice.map((c) => ({
        id: c.row.id as string,
        values: c.embedding,
        metadata: vectorizeMetadataFromChunkRow(c.row),
      })),
    );
  }
}

export async function deleteChunkVectorsForDocument(
  db: AppDb,
  index: VectorizeIndex,
  documentId: string,
): Promise<void> {
  const rows = await db
    .select({ id: documentChunks.id })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId));
  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += DELETE_ID_BATCH) {
    const slice = ids.slice(i, i + DELETE_ID_BATCH);
    if (slice.length > 0) {
      await index.deleteByIds(slice);
    }
  }
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

function buildVectorizeFilter(
  input: SearchDocumentChunksVectorInput,
): VectorizeVectorMetadataFilter | undefined {
  const f: VectorizeVectorMetadataFilter = {};
  if (input.entityType) {
    f.entityType = { $eq: input.entityType };
  }
  if (input.entityId !== undefined) {
    f.entityId = { $eq: input.entityId ?? "" };
  }
  if (input.documentId) {
    f.documentId = { $eq: input.documentId };
  }
  if (input.dealOpportunityId) {
    f.dealOpportunityId = { $eq: input.dealOpportunityId };
  }
  if (input.companyId) {
    f.companyId = { $eq: input.companyId };
  }
  if (input.themeId) {
    f.themeId = { $eq: input.themeId };
  }
  return Object.keys(f).length > 0 ? f : undefined;
}

export async function searchDocumentChunksVector(
  db: AppDb,
  index: VectorizeIndex,
  input: SearchDocumentChunksVectorInput,
): Promise<DocumentChunk[]> {
  const { queryEmbedding, limit = 10 } = input;
  if (!queryEmbedding.length) {
    return [];
  }

  const filter = buildVectorizeFilter(input);
  const { matches } = await index.query(queryEmbedding, {
    topK: limit,
    filter,
    returnMetadata: "indexed",
  });

  const idOrder = matches.map((m) => m.id);
  if (idOrder.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(documentChunks)
    .where(inArray(documentChunks.id, idOrder));

  const byId = new Map(rows.map((r) => [r.id, r]));
  return idOrder
    .map((id) => byId.get(id))
    .filter((r): r is DocumentChunk => r !== undefined);
}

export function getDocumentChunksVectorIndex(): VectorizeIndex {
  return env.DOCUMENT_CHUNKS_INDEX;
}
