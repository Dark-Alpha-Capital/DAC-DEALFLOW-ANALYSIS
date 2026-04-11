import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { generateObject } from "ai";
import { z } from "zod";
import db, { count, eq, runDbWithWorkerNeonPool } from "@repo/db";
import { documents, documentChunks } from "@repo/db/schema";
import { getScreenerQuestions } from "@repo/db/queries";
import {
  updateCimScreeningRun,
  upsertCimScreeningAnswer,
} from "@repo/db/mutations";
import { getEmbedding } from "@repo/rag-engine";
import { updateWorkflowJobProgress } from "@repo/db/workflow-jobs";
import { searchDocumentChunksVector } from "@/lib/document-chunk-vectorize";
import {
  buildCimScreeningQuestionPrompt,
  getOpenAIProvider,
} from "@repo/ai-core";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type { CimScreeningParams, WorkflowWorkerEnv } from "./workflow-env";

const openai = getOpenAIProvider();
const CIM_SCREENING_MODEL =
  process.env.CIM_SCREENING_MODEL?.trim() || "gpt-5.1";

const RETRIEVAL_TOP_K = 8;
const RETRIEVAL_TOP_K_DEAL = 14;

/** Structured logs for CIM template screening workflow runs (Workers + dashboard). */
const LOG = "[CimScreeningWorkflow]";

function logDetail(
  phase: string,
  data: Record<string, unknown> = {},
): void {
  console.log(`${LOG} ${phase}`, { ts: new Date().toISOString(), ...data });
}

function logError(
  phase: string,
  err: unknown,
  extra: Record<string, unknown> = {},
): void {
  console.error(`${LOG} ${phase}`, {
    ts: new Date().toISOString(),
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...extra,
  });
}

export class CimScreeningWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  CimScreeningParams
> {
  async run(
    event: WorkflowEvent<CimScreeningParams>,
    step: WorkflowStep,
  ): Promise<{ success: boolean; sessionId: string }> {
    const instanceId = event.instanceId;
    const {
      userId,
      documentId: payloadDocumentId,
      dealOpportunityId: payloadDealOppId,
      screenerId,
      sessionId,
      runId,
    } = event.payload;

    const dealOppId = payloadDealOppId?.trim();
    const libraryDocumentId = payloadDocumentId?.trim();
    const isDealScope = Boolean(dealOppId);
    if (isDealScope === Boolean(libraryDocumentId)) {
      throw new Error(
        "CimScreeningWorkflow: set exactly one of documentId or dealOpportunityId",
      );
    }

    logDetail("run.start", {
      instanceId,
      sessionId,
      runId,
      userId,
      documentId: libraryDocumentId ?? null,
      dealOpportunityId: dealOppId ?? null,
      screenerId,
      scope: isDealScope ? "deal_opportunity" : "library_document",
    });

    try {
      await runDbWithWorkerNeonPool(async () => markWorkflowRunning(instanceId));
      logDetail("markWorkflowRunning.done", { instanceId });

      if (isDealScope) {
        await step.do("validate-deal-rag", { timeout: "10 minutes" }, async () =>
          runDbWithWorkerNeonPool(async () => {
            if (!this.env.DOCUMENT_CHUNKS_INDEX) {
              throw new Error(
                "DOCUMENT_CHUNKS_INDEX is not bound; check wrangler vectorize config",
              );
            }
            await updateCimScreeningRun(runId, { status: "INGESTING" });
            await updateWorkflowJobProgress(instanceId, {
              step: "Validating deal documents",
              percentage: 10,
            });
            const [chunkCountRow] = await db
              .select({ n: count() })
              .from(documentChunks)
              .where(eq(documentChunks.dealOpportunityId, dealOppId!));
            const chunkRowsInDb = Number(chunkCountRow?.n ?? 0);
            if (chunkRowsInDb === 0) {
              throw new Error(
                "No ingested document chunks for this deal. Upload files and wait for processing, then try again.",
              );
            }
            logDetail("step.validate-deal-rag.ok", {
              dealOpportunityId: dealOppId,
              chunkRowsInDb,
            });
            await updateWorkflowJobProgress(instanceId, {
              step: "Ready to screen",
              percentage: 40,
            });
          }),
        );
      } else {
        await step.do(
          "validate-library-document",
          { timeout: "5 minutes" },
          async () =>
            runDbWithWorkerNeonPool(async () => {
              const documentId = libraryDocumentId!;
              logDetail("step.validate-library-document.enter", {
                instanceId,
                runId,
                documentId,
              });
              if (!this.env.DOCUMENT_CHUNKS_INDEX) {
                throw new Error(
                  "DOCUMENT_CHUNKS_INDEX is not bound; check wrangler vectorize config",
                );
              }
              await updateCimScreeningRun(runId, { status: "INGESTING" });
              await updateWorkflowJobProgress(instanceId, {
                step: "Validating ingested document",
                percentage: 10,
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
                category: document.category,
                ingestionStatus: document.ingestionStatus,
                uploadedById: document.uploadedById,
              });
              if (document.uploadedById !== userId) {
                logDetail("validate.document.forbidden_user", {
                  documentId,
                  expectedUserId: userId,
                  actualUploadedById: document.uploadedById,
                });
                throw new Error("Document does not belong to this user");
              }
              if (
                document.category !== "CIM_SCREENING" &&
                document.category !== "CIM"
              ) {
                logDetail("validate.document.bad_category", {
                  documentId,
                  category: document.category,
                });
                throw new Error(
                  "Document is not a CIM library or CIM template screening upload",
                );
              }
              if (document.ingestionStatus !== "PROCESSED") {
                throw new Error(
                  "Document is not ingested. Finish firm document (RAG) ingestion first, then start screening.",
                );
              }

              const [chunkCountRow] = await db
                .select({ n: count() })
                .from(documentChunks)
                .where(eq(documentChunks.documentId, documentId));
              const chunkRowsInDb = Number(chunkCountRow?.n ?? 0);
              if (chunkRowsInDb === 0) {
                throw new Error(
                  "No document chunks in the store for this file. Re-ingest from Firm documents.",
                );
              }
              logDetail("step.validate-library-document.ok", {
                documentId,
                chunkRowsInDb,
              });
              await updateWorkflowJobProgress(instanceId, {
                step: "Ready to screen",
                percentage: 40,
              });
            }),
        );
      }

      await step.do("screen-questions", { timeout: "60 minutes" }, async () =>
        runDbWithWorkerNeonPool(async () => {
          const screenT0 = Date.now();
          logDetail("step.screen-questions.enter", {
            instanceId,
            runId,
            screenerId,
            documentId: libraryDocumentId ?? null,
            dealOpportunityId: dealOppId ?? null,
            scope: isDealScope ? "deal_opportunity" : "library_document",
          });
          if (!this.env.DOCUMENT_CHUNKS_INDEX) {
            throw new Error(
              "DOCUMENT_CHUNKS_INDEX is not bound; check wrangler vectorize config",
            );
          }
          const vectorIndex = this.env.DOCUMENT_CHUNKS_INDEX;

          const [chunkCountRow] = isDealScope
            ? await db
                .select({ n: count() })
                .from(documentChunks)
                .where(eq(documentChunks.dealOpportunityId, dealOppId!))
            : await db
                .select({ n: count() })
                .from(documentChunks)
                .where(eq(documentChunks.documentId, libraryDocumentId!));
          const chunkRowsInDb = Number(chunkCountRow?.n ?? 0);

          const [screeningDoc] = isDealScope
            ? [null]
            : await db
                .select({
                  entityType: documents.entityType,
                  entityId: documents.entityId,
                  dealOpportunityId: documents.dealOpportunityId,
                  companyId: documents.companyId,
                  themeId: documents.themeId,
                })
                .from(documents)
                .where(eq(documents.id, libraryDocumentId!))
                .limit(1);

          logDetail("screen.rag.preflight", {
            documentId: libraryDocumentId ?? null,
            dealOpportunityId: dealOppId ?? null,
            chunkRowsInDb,
            vectorizeNamespace: isDealScope ? null : libraryDocumentId,
            retrievalTopK: isDealScope ? RETRIEVAL_TOP_K_DEAL : RETRIEVAL_TOP_K,
            vectorMetadataScope: isDealScope
              ? {
                  entityType: "DEAL_OPPORTUNITY" as const,
                  dealOpportunityId: dealOppId,
                }
              : screeningDoc
                ? {
                    entityType: screeningDoc.entityType,
                    entityId: screeningDoc.entityId,
                    dealOpportunityId: screeningDoc.dealOpportunityId,
                    companyId: screeningDoc.companyId,
                    themeId: screeningDoc.themeId,
                  }
                : null,
          });
          if (chunkRowsInDb === 0) {
            logDetail("screen.rag.preflight.warn_no_chunks", {
              documentId: libraryDocumentId ?? null,
              dealOpportunityId: dealOppId ?? null,
              message: isDealScope
                ? "No DocumentChunk rows for this deal; vector search will return nothing"
                : "No DocumentChunk rows for this document; vector search will return nothing",
            });
          }

          await updateCimScreeningRun(runId, { status: "SCREENING" });
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
            const hits = isDealScope
              ? await searchDocumentChunksVector(db, vectorIndex, {
                  queryEmbedding,
                  limit: RETRIEVAL_TOP_K_DEAL,
                  entityType: "DEAL_OPPORTUNITY",
                  dealOpportunityId: dealOppId!,
                })
              : await searchDocumentChunksVector(db, vectorIndex, {
                  queryEmbedding,
                  limit: RETRIEVAL_TOP_K,
                  documentId: libraryDocumentId!,
                  ...(screeningDoc
                    ? {
                        entityType: screeningDoc.entityType,
                        entityId: screeningDoc.entityId ?? null,
                        dealOpportunityId: screeningDoc.dealOpportunityId ?? "",
                        companyId: screeningDoc.companyId ?? "",
                        themeId: screeningDoc.themeId ?? "",
                      }
                    : {}),
                });
            const textHits = hits.filter(
              (h) => h.chunkText && h.chunkText.trim().length > 0,
            );
            logDetail("screen.question.vector_search", {
              questionId: q.id,
              documentId: libraryDocumentId ?? null,
              dealOpportunityId: dealOppId ?? null,
              vectorizeNamespace: isDealScope ? null : libraryDocumentId,
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

            const prompt = buildCimScreeningQuestionPrompt({
              question: q.question,
              excerpts,
            });

            const llmT0 = Date.now();
            const { object } = await generateObject({
              model: openai(CIM_SCREENING_MODEL),
              schema: z.object({
                score: z.number().min(0).max(10),
                rationale: z.string(),
              }),
              prompt,
            });
            logDetail("screen.question.llm_done", {
              questionId: q.id,
              model: CIM_SCREENING_MODEL,
              rawScore: object.score,
              rationaleLength: object.rationale?.length ?? 0,
              elapsedMs: Date.now() - llmT0,
            });

            const score = Math.round(Math.min(10, Math.max(0, object.score)));

            await upsertCimScreeningAnswer({
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

          await updateCimScreeningRun(runId, { status: "COMPLETED" });
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
      logError("run.failed", err, {
        instanceId,
        sessionId,
        runId,
        documentId: libraryDocumentId ?? null,
        dealOpportunityId: dealOppId ?? null,
      });
      const message = err instanceof Error ? err.message : String(err);
      try {
        await runDbWithWorkerNeonPool(async () =>
          updateCimScreeningRun(runId, {
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
