import type { documentChunks, documents } from "@repo/db/schema";

export type ChunkRow = typeof documentChunks.$inferInsert;

export type DocumentContext = Pick<
  typeof documents.$inferSelect,
  "id" | "entityType" | "entityId" | "dealOpportunityId" | "companyId" | "themeId"
>;

export interface MetadataBase {
  fileName: string;
  mimeType: string;
  source: "rag-ingestion";
}

export type ProcessResult =
  | { chunks: ChunkRow[] }
  | { unsupported: true; reason?: string };

export interface ProgressReporter {
  updateProgress(data: { step?: string; percentage?: number }): Promise<void>;
}
