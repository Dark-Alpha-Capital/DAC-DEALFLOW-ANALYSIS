import type { documentChunks, documents } from "@repo/db/schema";

/** Row shape inserted into Postgres (vectors live in Cloudflare Vectorize). */
export type DocumentChunkInsert = typeof documentChunks.$inferInsert;

/** @deprecated Use DocumentChunkInsert */
export type ChunkRow = DocumentChunkInsert;

export type DocumentContext = Pick<
  typeof documents.$inferSelect,
  "id" | "entityType" | "entityId" | "dealOpportunityId" | "companyId" | "themeId"
>;

export interface MetadataBase {
  fileName: string;
  mimeType: string;
  source: "rag-ingestion";
}

export type ProcessedChunk = { row: DocumentChunkInsert; embedding: number[] };

export type ProcessResult =
  | { chunks: ProcessedChunk[] }
  | { unsupported: true; reason?: string };

export interface ProgressReporter {
  updateProgress(data: { step?: string; percentage?: number }): Promise<void>;
}
