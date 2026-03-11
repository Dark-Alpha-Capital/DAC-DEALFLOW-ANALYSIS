import { Job } from "bullmq";
import { db, eq, sql } from "@repo/db";
import { documents, documentChunks } from "@repo/db/schema";
import { extractTextFromPdf } from "@repo/cim-extraction";
import { getEmbedding, isValidEmbeddingDimension } from "@repo/rag-engine";
import { extractFilePathFromUrl, getFileContents } from "@repo/nextcloud";
import { splitContentIntoChunks } from "../lib/utils";

export interface RagIngestionJobData {
  jobId?: string;
  documentId: string;
  userId: string;
  forceReingest?: boolean;
}

const TEXT_LIKE_MIME_TYPES = new Set(["text/plain", "text/csv", "application/json"]);

function resolveMimeType(fileName: string, mimeType: string | null): string {
  if (mimeType && mimeType.trim().length > 0) {
    return mimeType.toLowerCase();
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt" || ext === "md") return "text/plain";
  if (ext === "csv") return "text/csv";
  if (ext === "json") return "application/json";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  return "application/octet-stream";
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

export async function ragIngestionHandler(
  job: Job<RagIngestionJobData>,
): Promise<{ success: boolean; chunksInserted: number }> {
  const { documentId, forceReingest } = job.data;

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

    if (!forceReingest && document.ingestionStatus === "PROCESSED") {
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

    const fileBuffer = await getFileContents(filePath);
    const normalizedMime = resolveMimeType(document.fileName, document.mimeType);

    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));

    const metadataBase = {
      fileName: document.fileName,
      mimeType: normalizedMime,
      source: "rag-ingestion",
    } as const;

    const chunkRows: Array<typeof documentChunks.$inferInsert> = [];

    if (normalizedMime === "application/pdf") {
      await job.updateProgress({ step: "Extracting PDF text", percentage: 40 });
      const text = await extractTextFromPdf(Buffer.from(fileBuffer));
      const chunks = await splitContentIntoChunks(text, 1800, 200);

      for (const [index, chunkText] of chunks.entries()) {
        if (!chunkText.trim()) continue;
        const embedding = await getEmbedding(chunkText);
        if (!isValidEmbeddingDimension(embedding)) continue;

        chunkRows.push({
          documentId: document.id,
          entityType: document.entityType,
          entityId: document.entityId,
          dealOpportunityId: document.dealOpportunityId,
          companyId: document.companyId,
          themeId: document.themeId,
          chunkText,
          modality: "PDF",
          embedding,
          metadata: {
            ...metadataBase,
            chunkIndex: index,
            totalChunks: chunks.length,
          },
        });
      }
    } else if (TEXT_LIKE_MIME_TYPES.has(normalizedMime)) {
      await job.updateProgress({ step: "Chunking text content", percentage: 40 });
      const text = Buffer.from(fileBuffer).toString("utf-8");
      const chunks = await splitContentIntoChunks(text, 1800, 200);

      for (const [index, chunkText] of chunks.entries()) {
        if (!chunkText.trim()) continue;
        const embedding = await getEmbedding(chunkText);
        if (!isValidEmbeddingDimension(embedding)) continue;

        chunkRows.push({
          documentId: document.id,
          entityType: document.entityType,
          entityId: document.entityId,
          dealOpportunityId: document.dealOpportunityId,
          companyId: document.companyId,
          themeId: document.themeId,
          chunkText,
          modality: "TEXT",
          embedding,
          metadata: {
            ...metadataBase,
            chunkIndex: index,
            totalChunks: chunks.length,
          },
        });
      }
    } else if (
      normalizedMime.startsWith("image/") ||
      normalizedMime.startsWith("audio/") ||
      normalizedMime.startsWith("video/")
    ) {
      await job.updateProgress({ step: "Embedding media content", percentage: 40 });
      const embedding = await getEmbedding([
        {
          inlineData: {
            data: Buffer.from(fileBuffer).toString("base64"),
            mimeType: normalizedMime,
          },
        },
      ]);

      if (isValidEmbeddingDimension(embedding)) {
        const modality = normalizedMime.startsWith("image/")
          ? "IMAGE"
          : normalizedMime.startsWith("audio/")
            ? "AUDIO"
            : "VIDEO";

        chunkRows.push({
          documentId: document.id,
          entityType: document.entityType,
          entityId: document.entityId,
          dealOpportunityId: document.dealOpportunityId,
          companyId: document.companyId,
          themeId: document.themeId,
          chunkText: null,
          modality,
          embedding,
          metadata: metadataBase,
        });
      }
    } else {
      await db
        .update(documents)
        .set({
          ingestionStatus: "SKIPPED",
          ingestionCompletedAt: new Date(),
          ingestionError: `Unsupported mime type: ${normalizedMime}`,
        })
        .where(eq(documents.id, documentId));
      return { success: true, chunksInserted: 0 };
    }

    await job.updateProgress({ step: "Persisting chunks", percentage: 90 });

    if (!chunkRows.length) {
      await db
        .update(documents)
        .set({
          ingestionStatus: "SKIPPED",
          ingestionCompletedAt: new Date(),
          ingestionError: "No valid chunks produced during ingestion",
        })
        .where(eq(documents.id, documentId));
      return { success: true, chunksInserted: 0 };
    }

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
    return { success: true, chunksInserted: chunkRows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markDocumentIngestionFailed(documentId, message);
    throw error;
  }
}
