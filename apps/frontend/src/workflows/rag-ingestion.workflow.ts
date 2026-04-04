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

function ragDebug(phase: string, data: Record<string, unknown>) {
  console.log(`[rag-ingestion] ${phase}`, {
    ts: new Date().toISOString(),
    ...data,
  });
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
    if (!vectorIndex) {
      throw new Error("DOCUMENT_CHUNKS_INDEX is not bound; check wrangler vectorize config");
    }

    const instanceId = event.instanceId;
    const { documentId, forceReingest } = event.payload;

    try {
      ragDebug("workflow.run.start", { instanceId, documentId, forceReingest });
      await runDbWithWorkerNeonPool(async () => {
        await markWorkflowRunning(instanceId);
      });

      // `step.do` runs/replays its callback outside normal async ALS scope; bind a fresh Neon pool here.
      const result = await step.do(
        "rag-ingest",
        { timeout: "30 minutes" },
        () =>
          runDbWithWorkerNeonPool(async () => {
            const stepT0 = Date.now();
            const reporter = workflowProgressReporter(instanceId);
            ragDebug("step.rag-ingest.start", {
              instanceId,
              documentId,
              forceReingest,
            });

            await reporter.updateProgress({ step: "Loading document", percentage: 10 });

            const [document] = await db
              .select()
              .from(documents)
              .where(eq(documents.id, documentId))
              .limit(1);

            if (!document) {
              ragDebug("document.not_found", { documentId });
              throw new Error(`Document ${documentId} not found`);
            }

            ragDebug("document.loaded", {
              documentId,
              fileName: document.fileName,
              mimeType: document.mimeType,
              ingestionStatus: document.ingestionStatus,
              entityType: document.entityType,
              entityId: document.entityId,
              dealOpportunityId: document.dealOpportunityId,
              companyId: document.companyId,
              themeId: document.themeId,
              fileUrlHost: (() => {
                try {
                  return new URL(document.fileUrl).hostname;
                } catch {
                  return "invalid-url";
                }
              })(),
            });

            if (!forceReingest && document.ingestionStatus === "PROCESSED") {
              ragDebug("skip.already_processed", { documentId });
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
              ragDebug("file.path_resolve.failed", { documentId, fileUrl: document.fileUrl });
              throw new Error("Could not resolve storage path from document.fileUrl");
            }
            ragDebug("file.path_resolved", { documentId, filePath });

            const fetchT0 = Date.now();
            const fileBuffer = await getFileContents(filePath);
            ragDebug("file.fetched", {
              documentId,
              byteLength: fileBuffer.byteLength,
              elapsedMs: Date.now() - fetchT0,
            });

            const normalizedMime = resolveMimeType(
              document.fileName,
              document.mimeType,
            );
            ragDebug("mime.normalized", {
              documentId,
              normalizedMime,
              declaredMime: document.mimeType,
            });

            const vecDelT0 = Date.now();
            await deleteChunkVectorsForDocument(db, vectorIndex, documentId);
            ragDebug("vectorize.deleted_old", {
              documentId,
              elapsedMs: Date.now() - vecDelT0,
            });

            const sqlDelT0 = Date.now();
            await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
            ragDebug("sql.chunks_deleted", {
              documentId,
              elapsedMs: Date.now() - sqlDelT0,
            });

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
            const extractT0 = Date.now();
            ragDebug("processContent.start", {
              documentId,
              bufferLength: buf.length,
              forcePdfTextChunks: true,
            });
            const processResult: ProcessResult = await processContent(
              buf,
              normalizedMime,
              docContext,
              metadataBase,
              reporter,
              { forcePdfTextChunks: true },
            );
            ragDebug("processContent.done", {
              documentId,
              elapsedMs: Date.now() - extractT0,
              unsupported: "unsupported" in processResult,
            });

            if ("unsupported" in processResult) {
              const reason =
                processResult.reason ?? `Unsupported mime type: ${normalizedMime}`;
              ragDebug("ingest.skipped_unsupported", { documentId, reason, normalizedMime });
              await markDocumentSkipped(documentId, reason);
              return { success: true as const, chunksInserted: 0 };
            }

            const processed = processResult.chunks;
            if (!processed.length) {
              ragDebug("ingest.skipped_no_chunks", { documentId, normalizedMime });
              await markDocumentSkipped(documentId, "No valid chunks produced during ingestion");
              return { success: true as const, chunksInserted: 0 };
            }

            const sampleEmb = processed[0]?.embedding;
            ragDebug("ingest.chunks_ready", {
              documentId,
              chunkCount: processed.length,
              sampleChunkIds: processed.slice(0, 3).map((c) => c.row.id),
              sampleEmbeddingDim: sampleEmb?.length ?? 0,
            });

            await reporter.updateProgress({ step: "Persisting chunks", percentage: 90 });
            const chunkRows = processed.map((c) => c.row);
            const sqlInsT0 = Date.now();
            const inserted = await db
              .insert(documentChunks)
              .values(chunkRows)
              .returning({ id: documentChunks.id });
            if (inserted.length !== chunkRows.length) {
              ragDebug("sql.insert.mismatch", {
                documentId,
                inserted: inserted.length,
                expected: chunkRows.length,
              });
              throw new Error(
                `Chunk insert count mismatch: inserted ${inserted.length}, expected ${chunkRows.length}`,
              );
            }
            for (let i = 0; i < chunkRows.length; i++) {
              if (inserted[i]!.id !== chunkRows[i]!.id) {
                ragDebug("sql.insert.id_mismatch", {
                  documentId,
                  index: i,
                  dbId: inserted[i]!.id,
                  rowId: chunkRows[i]!.id,
                });
                throw new Error(
                  `Chunk id mismatch after insert at ${i}: db=${inserted[i]!.id}, row=${chunkRows[i]!.id}`,
                );
              }
            }
            ragDebug("sql.chunks_inserted", {
              documentId,
              rowCount: inserted.length,
              elapsedMs: Date.now() - sqlInsT0,
            });

            const vzT0 = Date.now();
            await upsertDocumentChunkVectors(vectorIndex, processed);
            ragDebug("vectorize.upserted", {
              documentId,
              vectorCount: processed.length,
              namespace: documentId,
              elapsedMs: Date.now() - vzT0,
            });

            await db
              .update(documents)
              .set({
                ingestionStatus: "PROCESSED",
                ingestionCompletedAt: new Date(),
                ingestionError: null,
              })
              .where(eq(documents.id, documentId));

            await reporter.updateProgress({ step: "Completed", percentage: 100 });
            ragDebug("step.rag-ingest.ok", {
              instanceId,
              documentId,
              chunksInserted: processed.length,
              totalStepElapsedMs: Date.now() - stepT0,
            });
            return { success: true as const, chunksInserted: processed.length };
          }),
      );

      ragDebug("workflow.run.completed", { instanceId, documentId, result });
      await runDbWithWorkerNeonPool(async () => {
        await markWorkflowCompleted(instanceId, result);
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[rag-ingestion] workflow.run.failed", {
        ts: new Date().toISOString(),
        instanceId,
        documentId,
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      });
      try {
        await runDbWithWorkerNeonPool(async () => {
          await markDocumentIngestionFailed(documentId, message);
        });
      } catch {
        // ignore
      }
      await runDbWithWorkerNeonPool(async () => {
        await markWorkflowFailed(instanceId, error);
      });
      throw error;
    }
  }
}
