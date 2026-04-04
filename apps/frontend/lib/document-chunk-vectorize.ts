import { env } from "cloudflare:workers";
import type { AppDb } from "@repo/db";
import { eq, inArray } from "@repo/db";
import type { InferInsertModel } from "drizzle-orm";
import { documentChunks, type DocumentChunk } from "@repo/db/schema";
import { EMBEDDING_DIMENSION, type ProcessedChunk } from "@repo/rag-engine";

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
    const vectors = slice.map((c) => {
      const values = c.embedding;
      if (!values || values.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `Vectorize upsert: chunk ${c.row.id} has invalid embedding length ${values?.length ?? 0} (expected ${EMBEDDING_DIMENSION})`,
        );
      }
      return {
        id: String(c.row.id),
        namespace: c.row.documentId,
        values,
        metadata: vectorizeMetadataFromChunkRow(c.row),
      };
    });
    const mutation = await index.upsert(vectors);
    // Sync/beta API returns { count, ids }; async RC API returns { mutationId } only.
    // Vite/miniflare mocks often omit both — only validate when count is present.
    const processed =
      mutation && typeof mutation === "object" && "count" in mutation
        ? (mutation as { count: number }).count
        : undefined;
    if (typeof processed === "number" && processed !== vectors.length) {
      throw new Error(
        `Vectorize upsert batch: expected ${vectors.length} vectors processed, got ${processed}`,
      );
    }
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
      try {
        await index.deleteByIds(slice);
      } catch (err) {
        // Miniflare / local Vectorize often returns 400; production should rarely hit this.
        console.warn(
          "[deleteChunkVectorsForDocument] Vectorize deleteByIds failed; continuing ingestion",
          {
            documentId,
            batchSize: slice.length,
            message: err instanceof Error ? err.message : String(err),
          },
        );
      }
    }
  }
}

/**
 * Pass whichever scope fields you need. Each field used in {@link buildVectorizeFilter} must have a
 * Vectorize metadata index (`wrangler vectorize create-metadata-index …`) or filtered queries can
 * return no matches. Upserts always write the same keys via {@link vectorizeMetadataFromChunkRow}.
 */
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

/** Builds Vectorize metadata $eq filters from the search input (AND semantics). */
export function buildVectorizeFilter(
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
  if (input.dealOpportunityId !== undefined) {
    f.dealOpportunityId = { $eq: input.dealOpportunityId };
  }
  if (input.companyId !== undefined) {
    f.companyId = { $eq: input.companyId };
  }
  if (input.themeId !== undefined) {
    f.themeId = { $eq: input.themeId };
  }
  return Object.keys(f).length > 0 ? f : undefined;
}

function metaString(
  md: Record<string, VectorizeVectorMetadata> | undefined,
  key: string,
): string {
  const v = md?.[key];
  return typeof v === "string" ? v : "";
}

/** Last-resort in-memory filter when Vectorize filter/index lag or mock stubs miss matches. */
function vectorizeMatchMatchesSearchInput(
  m: VectorizeMatch,
  input: SearchDocumentChunksVectorInput,
): boolean {
  const md = m.metadata;
  if (!md || typeof md !== "object") return false;
  const rec = md as Record<string, VectorizeVectorMetadata>;
  if (input.documentId && metaString(rec, "documentId") !== input.documentId) return false;
  if (input.entityType && metaString(rec, "entityType") !== input.entityType) return false;
  if (input.entityId !== undefined) {
    const want = input.entityId ?? "";
    if (metaString(rec, "entityId") !== want) return false;
  }
  if (input.dealOpportunityId !== undefined) {
    if (metaString(rec, "dealOpportunityId") !== input.dealOpportunityId) return false;
  }
  if (input.companyId !== undefined) {
    if (metaString(rec, "companyId") !== input.companyId) return false;
  }
  if (input.themeId !== undefined) {
    if (metaString(rec, "themeId") !== input.themeId) return false;
  }
  return true;
}

const VECTORIZE_METADATA_ALL_TOPK_MAX = 50;
const VECTORIZE_INDEX_LAG_RETRY_MS = 2000;
const VECTORIZE_INDEX_LAG_RETRIES = 2;

export async function searchDocumentChunksVector(
  db: AppDb,
  index: VectorizeIndex,
  input: SearchDocumentChunksVectorInput,
): Promise<DocumentChunk[]> {
  const { queryEmbedding, limit = 10 } = input;
  if (!queryEmbedding.length) {
    return [];
  }

  const scopedByDocument = Boolean(input.documentId);
  const metadataFilter = buildVectorizeFilter(input);

  const useMetadataAll = limit <= VECTORIZE_METADATA_ALL_TOPK_MAX;
  const topK = useMetadataAll
    ? Math.min(limit, VECTORIZE_METADATA_ALL_TOPK_MAX)
    : Math.min(limit, 100);
  const returnMetadata = useMetadataAll ? ("all" as const) : ("indexed" as const);

  const queryOpts = {
    topK,
    ...(metadataFilter ? { filter: metadataFilter } : {}),
    returnMetadata,
  };

  let matches: VectorizeMatch[];

  if (scopedByDocument) {
    const docId = input.documentId!;

    const queryNamespaced = () =>
      index.query(queryEmbedding, {
        ...queryOpts,
        namespace: docId,
      });

    let result = await queryNamespaced();
    matches = result.matches;

    for (let i = 0; i < VECTORIZE_INDEX_LAG_RETRIES && matches.length === 0; i++) {
      await new Promise((r) => setTimeout(r, VECTORIZE_INDEX_LAG_RETRY_MS));
      result = await queryNamespaced();
      matches = result.matches;
    }

    if (matches.length === 0 && metadataFilter) {
      const r2 = await index.query(queryEmbedding, queryOpts);
      matches = r2.matches;
    }

    if (matches.length === 0) {
      const r3 = await index.query(queryEmbedding, {
        topK: VECTORIZE_METADATA_ALL_TOPK_MAX,
        returnMetadata: "all",
      });
      matches = r3.matches
        .filter((m) => vectorizeMatchMatchesSearchInput(m, input))
        .slice(0, topK);
    }
  } else {
    const { matches: m } = await index.query(queryEmbedding, queryOpts);
    matches = m;
  }

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
