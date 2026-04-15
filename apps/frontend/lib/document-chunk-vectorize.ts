import { env } from "cloudflare:workers";
import type { AppDb } from "@repo/db";
import { and, eq, inArray } from "@repo/db";
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

function hasFiniteEmbeddingValues(values: number[]): boolean {
  for (const value of values) {
    if (!Number.isFinite(value)) return false;
  }
  return true;
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
      if (!hasFiniteEmbeddingValues(values)) {
        throw new Error(
          `Vectorize upsert: chunk ${c.row.id} has non-finite embedding values`,
        );
      }
      return {
        id: String(c.row.id),
        namespace: c.row.documentId,
        values,
        metadata: vectorizeMetadataFromChunkRow(c.row),
      };
    });
    let mutation:
      | { count?: number; ids?: string[]; mutationId?: string }
      | undefined;
    try {
      mutation = await index.upsert(vectors);
    } catch (batchError) {
      console.warn("[upsertDocumentChunkVectors] Batch upsert failed; retrying per vector", {
        batchSize: vectors.length,
        error: batchError instanceof Error ? batchError.message : String(batchError),
      });

      const failedIds: string[] = [];
      for (const vector of vectors) {
        try {
          await index.upsert([vector]);
        } catch (singleError) {
          failedIds.push(vector.id);
          console.warn("[upsertDocumentChunkVectors] Single upsert failed", {
            chunkId: vector.id,
            documentId: vector.namespace,
            error: singleError instanceof Error ? singleError.message : String(singleError),
          });
        }
      }

      if (failedIds.length > 0) {
        throw new Error(
          `Vectorize upsert failed for ${failedIds.length}/${vectors.length} vectors (first ids: ${failedIds.slice(0, 5).join(", ")})`,
        );
      }
      continue;
    }
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

/** Vectorize returns 400 when e.g. filtering on metadata fields without a metadata index, or bad vector length. */
function isVectorizeFilterQueryFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b400\b/.test(msg) ||
    /VECTOR_QUERY|vector query|metadata filter|filter/i.test(msg)
  );
}

/**
 * When a global metadata filter fails or is unsupported, restrict search to namespaces we know
 * (from Postgres) match the deal/company/theme scope, then filter in memory.
 */
async function distinctDocumentIdsForSearchInput(
  db: AppDb,
  input: SearchDocumentChunksVectorInput,
): Promise<string[]> {
  const parts = [];
  if (input.entityType) {
    parts.push(eq(documentChunks.entityType, input.entityType));
  }
  if (input.dealOpportunityId !== undefined) {
    parts.push(eq(documentChunks.dealOpportunityId, input.dealOpportunityId));
  }
  if (input.companyId !== undefined) {
    parts.push(eq(documentChunks.companyId, input.companyId));
  }
  if (input.themeId !== undefined) {
    parts.push(eq(documentChunks.themeId, input.themeId));
  }
  if (parts.length === 0) {
    return [];
  }
  const whereExpr = parts.length === 1 ? parts[0]! : and(...parts);
  const rows = await db
    .select({ documentId: documentChunks.documentId })
    .from(documentChunks)
    .where(whereExpr);
  return [...new Set(rows.map((r) => r.documentId))];
}

async function vectorMatchesByScanningNamespaces(
  db: AppDb,
  index: VectorizeIndex,
  queryEmbedding: number[],
  input: SearchDocumentChunksVectorInput,
  topK: number,
): Promise<VectorizeMatch[]> {
  const namespaces = await distinctDocumentIdsForSearchInput(db, input);
  if (namespaces.length === 0) {
    return [];
  }
  const perNsTop = Math.min(100, Math.max(topK * 3, topK));
  console.log("[vectorMatchesByScanningNamespaces] scan", {
    namespaceCount: namespaces.length,
    topK,
    perNsTop,
    filterSummary: {
      entityType: input.entityType,
      dealOpportunityId: input.dealOpportunityId,
    },
  });
  const all: VectorizeMatch[] = [];
  for (const ns of namespaces) {
    // Namespaces come from Postgres (deal/company/theme scope) — no metadata filter on the query.
    // Do not use `returnMetadata: "all"` here: it triggers 400 VECTOR_QUERY_ERROR on many indexes.
    // Scope is enforced by namespace list + SQL filter on loaded chunks (dealOpportunityId, etc.).
    try {
      const { matches } = await index.query(queryEmbedding, {
        topK: perNsTop,
        namespace: ns,
      });
      all.push(...matches);
    } catch (err) {
      console.warn("[vectorMatchesByScanningNamespaces] namespace query failed", {
        namespace: ns,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
  all.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const deduped: VectorizeMatch[] = [];
  for (const m of all) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    deduped.push(m);
  }
  return deduped.slice(0, topK);
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
  if (queryEmbedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Vector query: expected embedding length ${EMBEDDING_DIMENSION}, got ${queryEmbedding.length}`,
    );
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

    const queryNamespacedWithFallback = async (): Promise<VectorizeMatch[]> => {
      try {
        const result = await index.query(queryEmbedding, {
          ...queryOpts,
          namespace: docId,
        });
        return result.matches;
      } catch (err) {
        if (!metadataFilter || !isVectorizeFilterQueryFailure(err)) {
          throw err;
        }
        console.warn(
          "[searchDocumentChunksVector] Namespaced filtered query failed; retrying without metadata filter",
          {
            documentId: docId,
            message: err instanceof Error ? err.message : String(err),
          },
        );
        const { matches: m } = await index.query(queryEmbedding, {
          topK,
          returnMetadata,
          namespace: docId,
        });
        return m
          .filter((x) => vectorizeMatchMatchesSearchInput(x, input))
          .slice(0, topK);
      }
    };

    matches = await queryNamespacedWithFallback();

    for (let i = 0; i < VECTORIZE_INDEX_LAG_RETRIES && matches.length === 0; i++) {
      await new Promise((r) => setTimeout(r, VECTORIZE_INDEX_LAG_RETRY_MS));
      matches = await queryNamespacedWithFallback();
    }

    if (matches.length === 0 && metadataFilter) {
      try {
        const r2 = await index.query(queryEmbedding, queryOpts);
        matches = r2.matches;
      } catch (err) {
        if (!isVectorizeFilterQueryFailure(err)) {
          throw err;
        }
        console.warn(
          "[searchDocumentChunksVector] Global filtered query failed (library path); trying unfiltered global",
          {
            message: err instanceof Error ? err.message : String(err),
          },
        );
        matches = [];
      }
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
    // Multi-document (e.g. deal) scope: chunks are stored under namespace = documentId.
    // A global `query()` with metadata filters requires a metadata index per filter field in
    // Vectorize; without those indexes the API returns 400. Namespace queries need no filter,
    // so we skip the failing request and scan only namespaces that Postgres says belong to this scope.
    if (metadataFilter) {
      matches = await vectorMatchesByScanningNamespaces(
        db,
        index,
        queryEmbedding,
        input,
        topK,
      );
    } else {
      const { matches: m } = await index.query(queryEmbedding, {
        topK,
        returnMetadata,
      });
      matches = m;
    }
  }

  const idOrder = matches.map((m) => m.id);
  if (idOrder.length === 0) {
    return [];
  }

  const dealIdForSql =
    typeof input.dealOpportunityId === "string" &&
    input.dealOpportunityId.length > 0
      ? input.dealOpportunityId
      : null;
  const chunkWhere =
    dealIdForSql && !scopedByDocument
      ? and(
          inArray(documentChunks.id, idOrder),
          eq(documentChunks.dealOpportunityId, dealIdForSql),
        )
      : inArray(documentChunks.id, idOrder);

  const rows = await db
    .select()
    .from(documentChunks)
    .where(chunkWhere);

  const byId = new Map(rows.map((r) => [r.id, r]));
  return idOrder
    .map((id) => byId.get(id))
    .filter((r): r is DocumentChunk => r !== undefined);
}

export function getDocumentChunksVectorIndex(): VectorizeIndex {
  return env.DOCUMENT_CHUNKS_INDEX;
}
