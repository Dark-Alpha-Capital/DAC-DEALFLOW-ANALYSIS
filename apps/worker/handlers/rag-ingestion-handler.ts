import { Job } from "bullmq";
import { db, eq, sql } from "@repo/db";
import { documents, documentChunks } from "@repo/db/schema";
import { extractFilePathFromUrl, getFileContents } from "@repo/nextcloud";
import {
  processContent,
  resolveMimeType,
  type MetadataBase,
  type ProcessResult,
} from "@repo/rag-engine";

export interface RagIngestionJobData {
  jobId?: string;
  documentId: string;
  userId: string;
  forceReingest?: boolean;
}

async function markDocumentIngestionFailed(documentId: string, message: string) {
  await db
    .update(documents)
    .set({
      ingestionStatus: "FAILED",
      ingestionCompletedAt: new Date(),
      ingestionError: message,
    })
    .where(eq(documents.id, documentId));
}

async function markDocumentSkipped(
  documentId: string,
  reason: string
) {
  await db
    .update(documents)
    .set({
      ingestionStatus: "SKIPPED",
      ingestionCompletedAt: new Date(),
      ingestionError: reason,
    })
    .where(eq(documents.id, documentId));
}

export async function ragIngestionHandler(
  job: Job<RagIngestionJobData>,
): Promise<{ success: boolean; chunksInserted: number }> {
  const { documentId, forceReingest } = job.data;
  console.log("[rag-ingestion] Starting", { documentId, forceReingest });

  try {
    await job.updateProgress({ step: "Loading document", percentage: 10 });

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }
    console.log("[rag-ingestion] Document loaded", {
      fileName: document.fileName,
      mimeType: document.mimeType,
      ingestionStatus: document.ingestionStatus,
    });

    if (!forceReingest && document.ingestionStatus === "PROCESSED") {
      console.log("[rag-ingestion] Skipping - already processed");
      return { success: true, chunksInserted: 0 };
    }

    await db
      .update(documents)
      .set({
        ingestionStatus: "PROCESSING",
        ingestionStartedAt: new Date(),
        ingestionCompletedAt: null,
        ingestionError: null,
        ingestionAttemptCount: sql`${documents.ingestionAttemptCount} + 1`,
      })
      .where(eq(documents.id, documentId));

    await job.updateProgress({ step: "Fetching file", percentage: 20 });

    const filePath = extractFilePathFromUrl(document.fileUrl);
    if (!filePath) {
      throw new Error("Could not resolve storage path from document.fileUrl");
    }
    console.log("[rag-ingestion] File path resolved", { filePath });

    const fileBuffer = await getFileContents(filePath);
    const normalizedMime = resolveMimeType(document.fileName, document.mimeType);
    console.log("[rag-ingestion] File fetched", {
      sizeBytes: fileBuffer.length,
      normalizedMime,
    });

    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));

    const metadataBase: MetadataBase = {
      fileName: document.fileName,
      mimeType: normalizedMime,
      source: "rag-ingestion",
    };

    const docContext = {
      id: document.id,
      entityType: document.entityType,
      entityId: document.entityId,
      dealOpportunityId: document.dealOpportunityId,
      companyId: document.companyId,
      themeId: document.themeId,
    };

    const result: ProcessResult = await processContent(
      Buffer.from(fileBuffer),
      normalizedMime,
      docContext,
      metadataBase,
      job
    );

    if ("unsupported" in result) {
      console.log("[rag-ingestion] Unsupported mime type", {
        normalizedMime,
        reason: result.reason,
      });
      await markDocumentSkipped(documentId, result.reason ?? `Unsupported mime type: ${normalizedMime}`);
      return { success: true, chunksInserted: 0 };
    }

    const chunkRows = result.chunks;

    if (!chunkRows.length) {
      console.log("[rag-ingestion] No valid chunks produced");
      await markDocumentSkipped(documentId, "No valid chunks produced during ingestion");
      return { success: true, chunksInserted: 0 };
    }

    await job.updateProgress({ step: "Persisting chunks", percentage: 90 });
    console.log("[rag-ingestion] Persisting chunks", { count: chunkRows.length });
    await db.insert(documentChunks).values(chunkRows);

    await db
      .update(documents)
      .set({
        ingestionStatus: "PROCESSED",
        ingestionCompletedAt: new Date(),
        ingestionError: null,
      })
      .where(eq(documents.id, documentId));

    await job.updateProgress({ step: "Completed", percentage: 100 });
    console.log("[rag-ingestion] Completed", { documentId, chunksInserted: chunkRows.length });
    return { success: true, chunksInserted: chunkRows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[rag-ingestion] Failed", { documentId, error: message });
    await markDocumentIngestionFailed(documentId, message);
    throw error;
  }
}
