import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { generateObject } from "ai";
import { z } from "zod";
import db, { eq, runDbWithWorkerNeonPool, sql } from "@repo/db";
import { documents, documentChunks } from "@repo/db/schema";
import { getScreenerQuestions } from "@repo/db/queries";
import {
  updateSimScreeningRun,
  upsertSimScreeningAnswer,
} from "@repo/db/mutations";
import { extractFilePathFromUrl, getFileContents } from "@repo/nextcloud";
import {
  getEmbedding,
  processContent,
  resolveMimeType,
  type MetadataBase,
  type ProcessResult,
} from "@repo/rag-engine";
import { updateWorkflowJobProgress } from "@repo/db/workflow-jobs";
import {
  deleteChunkVectorsForDocument,
  searchDocumentChunksVector,
  upsertDocumentChunkVectors,
} from "@/lib/document-chunk-vectorize";
import {
  buildSimScreeningQuestionPrompt,
  getOpenAIProvider,
} from "@repo/ai-core";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
  workflowProgressReporter,
} from "./progress";
import type { SimScreeningParams, WorkflowWorkerEnv } from "./workflow-env";

const openai = getOpenAIProvider();

const RETRIEVAL_TOP_K = 8;

/** Structured logs for CIM / SIM screening workflow runs (Workers + dashboard). */
const LOG = "[SimScreeningWorkflow]";

function logDetail(
  phase: string,
  data: Record<string, unknown> = {},
): void {
  console.log(`${LOG} ${phase}`, { ts: new Date().toISOString(), ...data });
}

function logError(phase: string, err: unknown, extra: Record<string, unknown> = {}): void {
  console.error(`${LOG} ${phase}`, {
    ts: new Date().toISOString(),
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...extra,
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

export class SimScreeningWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  SimScreeningParams
> {
  async run(
    event: WorkflowEvent<SimScreeningParams>,
    step: WorkflowStep,
  ): Promise<{ success: boolean; sessionId: string }> {
    const instanceId = event.instanceId;
    const {
      userId,
      documentId,
      screenerId,
      sessionId,
      runId,
      skipIngest,
    } = event.payload;

    logDetail("run.start", {
      instanceId,
      sessionId,
      runId,
      userId,
      documentId,
      screenerId,
      skipIngest: skipIngest ?? false,
    });

    try {
      await runDbWithWorkerNeonPool(async () => markWorkflowRunning(instanceId));
      logDetail("markWorkflowRunning.done", { instanceId });

      await step.do("validate-and-ingest", { timeout: "30 minutes" }, async () =>
        runDbWithWorkerNeonPool(async () => {
          const ingestT0 = Date.now();
          let ingestStarted = false;
          try {
            logDetail("step.validate-and-ingest.enter", { instanceId, runId });
            await updateSimScreeningRun(runId, { status: "INGESTING" });
            await updateWorkflowJobProgress(instanceId, {
              step: "Loading document",
              percentage: 5,
            });

            const [document] = await db
              .select()
              .from(documents)
              .where(eq(documents.id, documentId))
              .limit(1);

            if (!document) {
              logDetail("validate.document.missing", { documentId });
              throw new Error(`Document ${documentId} not found`);
            }
            logDetail("validate.document.loaded", {
              documentId,
              fileName: document.fileName,
              mimeType: document.mimeType,
              category: document.category,
              ingestionStatus: document.ingestionStatus,
              fileSize: document.fileSize,
              uploadedById: document.uploadedById,
              entityType: document.entityType,
            });
            if (document.uploadedById !== userId) {
              logDetail("validate.document.forbidden_user", {
                documentId,
                expectedUserId: userId,
                actualUploadedById: document.uploadedById,
              });
              throw new Error("Document does not belong to this user");
            }
            if (document.category !== "SIM_SCREENING") {
              logDetail("validate.document.bad_category", {
                documentId,
                category: document.category,
              });
              throw new Error("Document is not a SIM screening upload");
            }

            if (
              skipIngest &&
              document.ingestionStatus === "PROCESSED"
            ) {
              logDetail("ingest.skipped_already_processed", {
                documentId,
                skipIngest,
                elapsedMs: Date.now() - ingestT0,
              });
              await updateWorkflowJobProgress(instanceId, {
                step: "Document already ingested",
                percentage: 40,
              });
              return { skipped: true as const };
            }

            await updateWorkflowJobProgress(instanceId, {
              step: "Fetching SIM file",
              percentage: 15,
            });

            const filePath = extractFilePathFromUrl(document.fileUrl);
            if (!filePath) {
              logDetail("ingest.file_path.unresolved", {
                fileUrlHost: (() => {
                  try {
                    return new URL(document.fileUrl).hostname;
                  } catch {
                    return "invalid_url";
                  }
                })(),
              });
              throw new Error("Could not resolve storage path from document.fileUrl");
            }
            logDetail("ingest.file_path.resolved", {
              pathSuffix: filePath.slice(-96),
            });

            const fetchT0 = Date.now();
            const fileBuffer = await getFileContents(filePath);
            logDetail("ingest.file_fetched", {
              byteLength: fileBuffer?.length ?? 0,
              elapsedMs: Date.now() - fetchT0,
            });

            const normalizedMime = resolveMimeType(
              document.fileName,
              document.mimeType,
            );
            logDetail("ingest.mime_resolved", { normalizedMime });

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
            ingestStarted = true;
            logDetail("ingest.document_status.processing", { documentId });

            const vecDelT0 = Date.now();
            await deleteChunkVectorsForDocument(
              db,
              this.env.DOCUMENT_CHUNKS_INDEX,
              documentId,
            );
            logDetail("ingest.vectorize.deleted_old_vectors", {
              documentId,
              elapsedMs: Date.now() - vecDelT0,
            });

            const sqlDelT0 = Date.now();
            await db
              .delete(documentChunks)
              .where(eq(documentChunks.documentId, documentId));
            logDetail("ingest.sql.deleted_old_chunks", {
              documentId,
              elapsedMs: Date.now() - sqlDelT0,
            });

            const reporter = workflowProgressReporter(instanceId);
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
            const processResult: ProcessResult = await processContent(
              buf,
              normalizedMime,
              docContext,
              metadataBase,
              reporter,
              { forcePdfTextChunks: true },
            );
            logDetail("ingest.processContent.done", {
              elapsedMs: Date.now() - extractT0,
              unsupported: "unsupported" in processResult,
            });

            if ("unsupported" in processResult) {
              const reason =
                processResult.reason ?? `Unsupported mime type: ${normalizedMime}`;
              logDetail("ingest.unsupported_mime", { reason, normalizedMime });
              await db
                .update(documents)
                .set({
                  ingestionStatus: "SKIPPED",
                  ingestionCompletedAt: new Date(),
                  ingestionError: reason,
                })
                .where(eq(documents.id, documentId));
              throw new Error(reason);
            }

            const processed = processResult.chunks;
            if (!processed.length) {
              logDetail("ingest.no_chunks", { documentId, normalizedMime });
              await db
                .update(documents)
                .set({
                  ingestionStatus: "SKIPPED",
                  ingestionCompletedAt: new Date(),
                  ingestionError: "No valid chunks produced during ingestion",
                })
                .where(eq(documents.id, documentId));
              throw new Error("No valid chunks produced during ingestion");
            }

            logDetail("ingest.chunks_ready", {
              chunkCount: processed.length,
              sampleChunkIds: processed.slice(0, 3).map((c) => c.row.id),
            });

            await updateWorkflowJobProgress(instanceId, {
              step: "Persisting embeddings",
              percentage: 40,
            });
            const chunkRows = processed.map((c) => c.row);
            const sqlInsT0 = Date.now();
            await db.insert(documentChunks).values(chunkRows);
            logDetail("ingest.sql.chunks_inserted", {
              rowCount: chunkRows.length,
              elapsedMs: Date.now() - sqlInsT0,
            });

            const vzT0 = Date.now();
            await upsertDocumentChunkVectors(
              this.env.DOCUMENT_CHUNKS_INDEX,
              processed,
            );
            logDetail("ingest.vectorize.upserted", {
              vectorCount: processed.length,
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

            logDetail("step.validate-and-ingest.ok", {
              chunksInserted: processed.length,
              totalIngestElapsedMs: Date.now() - ingestT0,
            });
            return { chunksInserted: processed.length };
          } catch (ingestErr) {
            logError("step.validate-and-ingest.failed", ingestErr, {
              instanceId,
              documentId,
              ingestStarted,
              elapsedMs: Date.now() - ingestT0,
            });
            const msg =
              ingestErr instanceof Error ? ingestErr.message : String(ingestErr);
            if (ingestStarted) {
              await markDocumentIngestionFailed(documentId, msg);
            }
            throw ingestErr;
          }
        }),
      );

      await step.do("screen-questions", { timeout: "60 minutes" }, async () =>
        runDbWithWorkerNeonPool(async () => {
          const screenT0 = Date.now();
          logDetail("step.screen-questions.enter", {
            instanceId,
            runId,
            screenerId,
            documentId,
          });

          await updateSimScreeningRun(runId, { status: "SCREENING" });
          await updateWorkflowJobProgress(instanceId, {
            step: "Loading screener questions",
            percentage: 45,
          });

          const questions = await getScreenerQuestions(screenerId);
          logDetail("screen.questions.loaded", {
            screenerId,
            questionCount: questions.length,
          });
          if (!questions.length) {
            throw new Error("Screener has no questions");
          }

          const total = questions.length;
          for (let i = 0; i < total; i++) {
            const q = questions[i]!;
            const qPreview =
              q.question.length > 120
                ? `${q.question.slice(0, 120)}…`
                : q.question;
            const pct = 45 + Math.round(((i + 1) / total) * 50);
            await updateWorkflowJobProgress(instanceId, {
              step: `Question ${i + 1} of ${total}`,
              percentage: Math.min(pct, 95),
            });

            const qT0 = Date.now();
            logDetail("screen.question.start", {
              index: i + 1,
              total,
              questionId: q.id,
              questionPreview: qPreview,
            });

            const embT0 = Date.now();
            const queryEmbedding = await getEmbedding(q.question);
            if (!queryEmbedding?.length) {
              logDetail("screen.question.embed_failed", { questionId: q.id });
              throw new Error("Failed to embed screener question");
            }
            logDetail("screen.question.embedded", {
              questionId: q.id,
              dim: queryEmbedding.length,
              elapsedMs: Date.now() - embT0,
            });

            const ragT0 = Date.now();
            const hits = await searchDocumentChunksVector(
              db,
              this.env.DOCUMENT_CHUNKS_INDEX,
              {
                queryEmbedding,
                limit: RETRIEVAL_TOP_K,
                documentId,
              },
            );
            const textHits = hits.filter(
              (h) => h.chunkText && h.chunkText.trim().length > 0,
            );
            logDetail("screen.question.vector_search", {
              questionId: q.id,
              hitCount: hits.length,
              textHitCount: textHits.length,
              topChunkIds: hits.slice(0, 5).map((h) => h.id),
              elapsedMs: Date.now() - ragT0,
            });

            const excerpts =
              textHits.length > 0
                ? textHits
                  .map(
                    (h, idx) =>
                      `[Excerpt ${idx + 1}]\n${h.chunkText!.trim()}`,
                  )
                  .join("\n\n")
                : "No text excerpts were retrieved for this question.";
            logDetail("screen.question.excerpts_built", {
              questionId: q.id,
              excerptCharLength: excerpts.length,
            });

            const prompt = buildSimScreeningQuestionPrompt({
              question: q.question,
              excerpts,
            });

            const llmT0 = Date.now();
            const { object } = await generateObject({
              model: openai("gpt-4o-mini"),
              schema: z.object({
                score: z.number().min(0).max(10),
                rationale: z.string(),
              }),
              prompt,
            });
            logDetail("screen.question.llm_done", {
              questionId: q.id,
              rawScore: object.score,
              rationaleLength: object.rationale?.length ?? 0,
              elapsedMs: Date.now() - llmT0,
            });

            const score = Math.round(
              Math.min(10, Math.max(0, object.score)),
            );

            await upsertSimScreeningAnswer({
              runId,
              questionId: q.id,
              score,
              rationale: object.rationale,
              evidenceChunkIds: textHits.map((h) => h.id),
            });
            logDetail("screen.question.saved", {
              questionId: q.id,
              score,
              evidenceChunkCount: textHits.length,
              questionElapsedMs: Date.now() - qT0,
            });
          }

          await updateSimScreeningRun(runId, { status: "COMPLETED" });
          await updateWorkflowJobProgress(instanceId, {
            step: "Completed",
            percentage: 100,
          });
          logDetail("step.screen-questions.ok", {
            runId,
            questionsAnswered: total,
            totalScreenElapsedMs: Date.now() - screenT0,
          });
        }),
      );

      const out = { success: true as const, sessionId, runId };
      logDetail("run.completed", { instanceId, sessionId, runId });
      await runDbWithWorkerNeonPool(async () =>
        markWorkflowCompleted(instanceId, out),
      );
      return out;
    } catch (err) {
      logError("run.failed", err, { instanceId, sessionId, runId, documentId });
      const message = err instanceof Error ? err.message : String(err);
      try {
        await runDbWithWorkerNeonPool(async () =>
          updateSimScreeningRun(runId, {
            status: "FAILED",
            errorMessage: message,
          }),
        );
      } catch {
        // ignore
      }
      await runDbWithWorkerNeonPool(async () =>
        markWorkflowFailed(instanceId, err),
      );
      throw err;
    }
  }
}
