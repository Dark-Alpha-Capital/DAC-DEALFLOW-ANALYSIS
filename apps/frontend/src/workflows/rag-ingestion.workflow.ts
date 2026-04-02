import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import db, { eq, runDbWithWorkerNeonPool, sql } from "@repo/db";
import { documents, documentChunks } from "@repo/db/schema";
import { extractFilePathFromUrl, getFileContents } from "@repo/nextcloud";
import {
  processContent,
  resolveMimeType,
  type MetadataBase,
  type ProcessResult,
} from "@repo/rag-engine";
import {
  deleteChunkVectorsForDocument,
  upsertDocumentChunkVectors,
} from "@/lib/document-chunk-vectorize";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
  workflowProgressReporter,
} from "./progress";
import type { RagIngestionParams, WorkflowWorkerEnv } from "./workflow-env";

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

async function markDocumentSkipped(documentId: string, reason: string) {
  await db
    .update(documents)
    .set({
      ingestionStatus: "SKIPPED",
      ingestionCompletedAt: new Date(),
      ingestionError: reason,
    })
    .where(eq(documents.id, documentId));
}

export class RagIngestionWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  RagIngestionParams
> {
  async run(
    event: WorkflowEvent<RagIngestionParams>,
    step: WorkflowStep,
  ): Promise<{ success: boolean; chunksInserted: number }> {
    const vectorIndex = this.env.DOCUMENT_CHUNKS_INDEX;
    return runDbWithWorkerNeonPool(async () => {
      const instanceId = event.instanceId;
      const { documentId, forceReingest } = event.payload;

      try {
        await markWorkflowRunning(instanceId);
        const result = await step.do(
          "rag-ingest",
          { timeout: "30 minutes" },
          async () => {
            const reporter = workflowProgressReporter(instanceId);
            console.log("[rag-ingestion] Starting", { documentId, forceReingest });

            await reporter.updateProgress({ step: "Loading document", percentage: 10 });

            const [document] = await db
              .select()
              .from(documents)
              .where(eq(documents.id, documentId))
              .limit(1);

            if (!document) {
              throw new Error(`Document ${documentId} not found`);
            }

            if (!forceReingest && document.ingestionStatus === "PROCESSED") {
              console.log("[rag-ingestion] Skipping - already processed");
              return { success: true as const, chunksInserted: 0 };
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

            await reporter.updateProgress({ step: "Fetching file", percentage: 20 });

            const filePath = extractFilePathFromUrl(document.fileUrl);
            if (!filePath) {
              throw new Error("Could not resolve storage path from document.fileUrl");
            }

            const fileBuffer = await getFileContents(filePath);
            const normalizedMime = resolveMimeType(
              document.fileName,
              document.mimeType,
            );

            await deleteChunkVectorsForDocument(db, vectorIndex, documentId);
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

            const buf = Buffer.from(fileBuffer);
            const processResult: ProcessResult = await processContent(
              buf,
              normalizedMime,
              docContext,
              metadataBase,
              reporter,
            );

            if ("unsupported" in processResult) {
              await markDocumentSkipped(
                documentId,
                processResult.reason ?? `Unsupported mime type: ${normalizedMime}`,
              );
              return { success: true as const, chunksInserted: 0 };
            }

            const processed = processResult.chunks;
            if (!processed.length) {
              await markDocumentSkipped(documentId, "No valid chunks produced during ingestion");
              return { success: true as const, chunksInserted: 0 };
            }

            await reporter.updateProgress({ step: "Persisting chunks", percentage: 90 });
            const chunkRows = processed.map((c) => c.row);
            await db.insert(documentChunks).values(chunkRows);
            await upsertDocumentChunkVectors(vectorIndex, processed);

            await db
              .update(documents)
              .set({
                ingestionStatus: "PROCESSED",
                ingestionCompletedAt: new Date(),
                ingestionError: null,
              })
              .where(eq(documents.id, documentId));

            await reporter.updateProgress({ step: "Completed", percentage: 100 });
            return { success: true as const, chunksInserted: processed.length };
          },
        );

        await markWorkflowCompleted(instanceId, result);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[rag-ingestion] Failed", { documentId, error: message });
        try {
          await markDocumentIngestionFailed(documentId, message);
        } catch {
          // ignore
        }
        await markWorkflowFailed(instanceId, error);
        throw error;
      }
    });
  }
}
