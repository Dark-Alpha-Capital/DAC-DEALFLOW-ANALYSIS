import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { AppDb } from "@repo/db";
import db, { count, eq, runDbWithWorkerNeonPool } from "@repo/db";
import { documents, documentChunks } from "@repo/db/schema";
import {
  formatDealOpportunityScreeningContext,
  getCimScreeningAnswersWithQuestionsByRunId,
  getDealOpportunityScreeningContextRow,
  getScreenerQuestions,
} from "@repo/db/queries";
import {
  updateCimScreeningRun,
  upsertCimScreeningAnswer,
} from "@repo/db/mutations";
import { getEmbedding } from "@repo/rag-engine";
import { updateWorkflowJobProgress } from "@repo/db/workflow-jobs";
import {
  searchDocumentChunksVector,
  type SearchDocumentChunksVectorInput,
} from "@/lib/document-chunk-vectorize";
import {
  buildCimScreeningQuestionPrompt,
  getOpenAIProvider,
} from "@repo/ai-core";
import { callBitrix, getBitrixSyncEnv } from "@repo/bitrix-sync";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type {
  CimScreeningDealListingContextSource,
  CimScreeningParams,
  WorkflowWorkerEnv,
} from "./workflow-env";

const openai = getOpenAIProvider();
const CIM_SCREENING_MODEL =
  process.env.CIM_SCREENING_MODEL?.trim() || "gpt-5.1";

/** Pause between questions to avoid Vectorize/OpenAI bursts (deal RAG scans many namespaces per query). */
function cimScreeningInterQuestionDelayMs(): number {
  const raw = process.env.CIM_SCREENING_INTER_QUESTION_DELAY_MS?.trim();
  if (!raw) return 350;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 350;
  return Math.min(30_000, n);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type ScreenerQuestionRow = Awaited<
  ReturnType<typeof getScreenerQuestions>
>[number];

const RETRIEVAL_TOP_K = 8;
const RETRIEVAL_TOP_K_DEAL = 14;
const QUESTION_PREVIEW_MAX = 120;
/** Bitrix timeline comments have practical size limits; keep margin under typical API caps. */
const BITRIX_SCREENING_COMMENT_MAX_CHARS = 62_000;

/** Hoisted once — avoid recreating the schema inside the per-question loop. */
const SCREENING_ANSWER_SCHEMA = z.object({
  score: z.number().min(0).max(10),
  rationale: z.string(),
});

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

function screeningBandFromAverage(
  avgScore: number | null,
): "INCOMPLETE" | "PASS" | "FAIL" {
  if (avgScore == null) return "INCOMPLETE";
  if (avgScore >= 7) return "PASS";
  if (avgScore >= 4) return "INCOMPLETE";
  return "FAIL";
}

type LibraryScreeningDocMeta = {
  entityType: (typeof documents.$inferSelect)["entityType"];
  entityId: (typeof documents.$inferSelect)["entityId"];
  dealOpportunityId: (typeof documents.$inferSelect)["dealOpportunityId"];
  companyId: (typeof documents.$inferSelect)["companyId"];
  themeId: (typeof documents.$inferSelect)["themeId"];
};

function buildExcerptsFromHits(
  textHits: { chunkText: string | null }[],
): string {
  if (textHits.length === 0) {
    return "No text excerpts were retrieved for this question.";
  }
  return textHits
    .map((h, idx) => `[Excerpt ${idx + 1}]\n${h.chunkText!.trim()}`)
    .join("\n\n");
}

function buildBitrixTimelineCommentText(input: {
  runId: string;
  screenerId: string;
  sessionId: string;
  qaRows: Awaited<
    ReturnType<typeof getCimScreeningAnswersWithQuestionsByRunId>
  >;
}): { comment: string; truncated: boolean } {
  const scores = input.qaRows
    .map((r) => r.score)
    .filter((s): s is number => s != null);
  const avgScore =
    scores.length > 0
      ? scores.reduce((sum, a) => sum + a, 0) / scores.length
      : null;
  const status = screeningBandFromAverage(avgScore);

  const qaBody = input.qaRows
    .map((row, i) => {
      const q = row.questionText?.trim() || "(question)";
      const rationale = row.rationale?.trim() || "—";
      return [
        `${i + 1}. ${q}`,
        `   Score: ${row.score ?? "—"}/10`,
        "",
        rationale,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const header = [
    "AI CIM screening completed",
    `Run ID: ${input.runId}`,
    `Screener ID: ${input.screenerId}`,
    avgScore == null
      ? null
      : `Average score: ${avgScore.toFixed(1)}/10 (${status})`,
    `App session: /screening/${input.sessionId}`,
    "",
    "Questions and answers:",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const full = `${header}${qaBody}`;
  const tail =
    "\n\n[Truncated: comment exceeded maximum length for Bitrix timeline]";
  if (full.length <= BITRIX_SCREENING_COMMENT_MAX_CHARS) {
    return { comment: full, truncated: false };
  }
  const maxBody = BITRIX_SCREENING_COMMENT_MAX_CHARS - tail.length;
  return { comment: full.slice(0, maxBody) + tail, truncated: true };
}

type DealListingLoadResult =
  | { kind: "bitrix_live_snapshot"; text: string | null }
  | {
    kind: "deal_opportunity_db";
    text: string | null;
    bitrixId: string | null;
  };

async function loadDealListingForScreeningPrompt(input: {
  dealOppId: string;
  effectiveListingSource: CimScreeningDealListingContextSource | undefined;
  bitrixLiveDealListingContext: string | undefined;
}): Promise<DealListingLoadResult> {
  if (input.effectiveListingSource === "bitrix_live_snapshot") {
    const raw = input.bitrixLiveDealListingContext?.trim();
    return { kind: "bitrix_live_snapshot", text: raw || null };
  }
  const dealRow = await getDealOpportunityScreeningContextRow(input.dealOppId);
  if (!dealRow) {
    return { kind: "deal_opportunity_db", text: null, bitrixId: null };
  }
  return {
    kind: "deal_opportunity_db",
    text: formatDealOpportunityScreeningContext(dealRow),
    bitrixId: dealRow.bitrixId ?? null,
  };
}

async function searchChunksForQuestion(input: {
  db: AppDb;
  vectorIndex: VectorizeIndex;
  queryEmbedding: number[];
  isDealScope: boolean;
  dealOppId: string | null;
  libraryDocumentId: string | null;
  screeningDoc: LibraryScreeningDocMeta | null;
}): Promise<Awaited<ReturnType<typeof searchDocumentChunksVector>>> {
  // Deal scope: single filter — chunks for this deal opportunity (Vectorize scans namespaces from Postgres).
  if (input.isDealScope && input.dealOppId) {
    const params: SearchDocumentChunksVectorInput = {
      queryEmbedding: input.queryEmbedding,
      limit: RETRIEVAL_TOP_K_DEAL,
      entityType: "DEAL_OPPORTUNITY",
      dealOpportunityId: input.dealOppId,
    };
    return searchDocumentChunksVector(input.db, input.vectorIndex, params);
  }
  if (!input.libraryDocumentId) {
    throw new Error("CimScreeningWorkflow: library document id required");
  }
  const base: SearchDocumentChunksVectorInput = {
    queryEmbedding: input.queryEmbedding,
    limit: RETRIEVAL_TOP_K,
    documentId: input.libraryDocumentId,
  };
  const doc = input.screeningDoc;
  if (doc) {
    return searchDocumentChunksVector(input.db, input.vectorIndex, {
      ...base,
      entityType: doc.entityType,
      entityId: doc.entityId ?? null,
      dealOpportunityId: doc.dealOpportunityId ?? "",
      companyId: doc.companyId ?? "",
      themeId: doc.themeId ?? "",
    });
  }
  return searchDocumentChunksVector(input.db, input.vectorIndex, base);
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
      bitrixDealId,
      postBitrixComment,
      dealListingContextSource: payloadListingSource,
      bitrixLiveDealListingContext,
    } = event.payload;

    const dealOppId = payloadDealOppId?.trim();
    const libraryDocumentId = payloadDocumentId?.trim();
    const isDealScope = Boolean(dealOppId);
    if (isDealScope === Boolean(libraryDocumentId)) {
      throw new Error(
        "CimScreeningWorkflow: set exactly one of documentId or dealOpportunityId",
      );
    }

    const effectiveListingSource =
      payloadListingSource ??
      (isDealScope ? ("deal_opportunity_db" as const) : undefined);

    const bitrixWidgetDealScreening =
      isDealScope && effectiveListingSource === "bitrix_live_snapshot";

    logDetail("run.start", {
      instanceId,
      sessionId,
      runId,
      userId,
      documentId: libraryDocumentId ?? null,
      dealOpportunityId: dealOppId ?? null,
      screenerId,
      scope: isDealScope ? "deal_opportunity" : "library_document",
      dealListingContextSource: effectiveListingSource ?? null,
      bitrixLiveContextChars: bitrixLiveDealListingContext?.length ?? 0,
      bitrixWidgetDealScreening,
      /** RAG excerpts still come from ingested deal documents (Vectorize); this flag is only about listing/deal metadata in the LLM prompt. */
      promptDealListingSource:
        !isDealScope
          ? "n/a_library_document_screening"
          : bitrixWidgetDealScreening
            ? "bitrix_live_rest_snapshot_not_deal_opportunity_db"
            : "deal_opportunity_postgres_row",
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

          let chunkRowsInDb: number;
          let screeningDoc: LibraryScreeningDocMeta | null = null;

          if (isDealScope) {
            const [chunkCountRow] = await db
              .select({ n: count() })
              .from(documentChunks)
              .where(eq(documentChunks.dealOpportunityId, dealOppId!));
            chunkRowsInDb = Number(chunkCountRow?.n ?? 0);
          } else {
            const docId = libraryDocumentId!;
            const [chunkResult, docRows] = await Promise.all([
              db
                .select({ n: count() })
                .from(documentChunks)
                .where(eq(documentChunks.documentId, docId)),
              db
                .select({
                  entityType: documents.entityType,
                  entityId: documents.entityId,
                  dealOpportunityId: documents.dealOpportunityId,
                  companyId: documents.companyId,
                  themeId: documents.themeId,
                })
                .from(documents)
                .where(eq(documents.id, docId))
                .limit(1),
            ]);
            chunkRowsInDb = Number(chunkResult[0]?.n ?? 0);
            screeningDoc = docRows[0] ?? null;
          }

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

          let dealListingContextForPrompt: string | null = null;
          if (isDealScope && dealOppId) {
            const listing = await loadDealListingForScreeningPrompt({
              dealOppId,
              effectiveListingSource,
              bitrixLiveDealListingContext,
            });
            dealListingContextForPrompt = listing.text;
            if (listing.kind === "bitrix_live_snapshot") {
              logDetail("screen.deal_listing_context", {
                source: "bitrix_live_snapshot",
                dealOpportunityId: dealOppId,
                hasListingContext: Boolean(listing.text),
                charLength: listing.text?.length ?? 0,
              });
              logDetail("screen.deal_listing.bitrix_widget_confirm", {
                message:
                  "Prompt listing fields: live Bitrix REST snapshot (crm.deal-style text). Not using DealOpportunity row from Postgres for this text. Document excerpts still come from ingested uploads (RAG/Vectorize).",
                dealOpportunityId: dealOppId,
              });
            } else if (listing.text) {
              logDetail("screen.deal_listing_context", {
                source: "deal_opportunity_db",
                dealOpportunityId: dealOppId,
                hasListingContext: true,
                bitrixId: listing.bitrixId,
                lineCount: listing.text.split("\n").length,
              });
            } else {
              logDetail("screen.deal_listing_context.row_missing", {
                source: "deal_opportunity_db",
                dealOpportunityId: dealOppId,
              });
            }
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
          const interQuestionDelayMs = cimScreeningInterQuestionDelayMs();
          logDetail("screen.questions.sequential_plan", {
            questionCount: total,
            interQuestionDelayMs,
            envCIM_SCREENING_INTER_QUESTION_DELAY_MS:
              process.env.CIM_SCREENING_INTER_QUESTION_DELAY_MS ?? null,
            scope: isDealScope ? "deal_opportunity" : "library_document",
            dealOpportunityId: dealOppId ?? null,
          });

          const processQuestionAtIndex = async (
            i: number,
            q: ScreenerQuestionRow,
          ): Promise<void> => {
            const qPreview =
              q.question.length > QUESTION_PREVIEW_MAX
                ? `${q.question.slice(0, QUESTION_PREVIEW_MAX)}…`
                : q.question;
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
            logDetail("screen.question.vector_query_start", {
              questionId: q.id,
              index: i + 1,
              total,
              isDealScope,
              dealOpportunityId: dealOppId ?? null,
              libraryDocumentId: libraryDocumentId ?? null,
              topK: isDealScope ? RETRIEVAL_TOP_K_DEAL : RETRIEVAL_TOP_K,
            });
            let hits: Awaited<ReturnType<typeof searchChunksForQuestion>>;
            try {
              hits = await searchChunksForQuestion({
                db,
                vectorIndex,
                queryEmbedding,
                isDealScope,
                dealOppId: dealOppId ?? null,
                libraryDocumentId: libraryDocumentId ?? null,
                screeningDoc,
              });
            } catch (vectorErr) {
              logError("screen.question.vector_query_failed", vectorErr, {
                questionId: q.id,
                index: i + 1,
                isDealScope,
                dealOpportunityId: dealOppId ?? null,
                libraryDocumentId: libraryDocumentId ?? null,
              });
              throw vectorErr;
            }
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

            const excerpts = buildExcerptsFromHits(textHits);
            logDetail("screen.question.excerpts_built", {
              questionId: q.id,
              excerptCharLength: excerpts.length,
            });

            const prompt = buildCimScreeningQuestionPrompt({
              question: q.question,
              excerpts,
              dealListingContext: dealListingContextForPrompt,
            });

            const llmT0 = Date.now();
            const { output } = await generateText({
              model: openai(CIM_SCREENING_MODEL),
              prompt,
              output: Output.object({
                schema: SCREENING_ANSWER_SCHEMA,
              }),
            });
            if (!output) {
              throw new Error("CIM screening produced no structured output");
            }
            logDetail("screen.question.llm_done", {
              questionId: q.id,
              model: CIM_SCREENING_MODEL,
              rawScore: output.score,
              rationaleLength: output.rationale?.length ?? 0,
              elapsedMs: Date.now() - llmT0,
            });

            const score = Math.round(Math.min(10, Math.max(0, output.score)));

            await upsertCimScreeningAnswer({
              runId,
              questionId: q.id,
              score,
              rationale: output.rationale,
              evidenceChunkIds: textHits.map((h) => h.id),
            });
            logDetail("screen.question.saved", {
              questionId: q.id,
              score,
              evidenceChunkCount: textHits.length,
              questionElapsedMs: Date.now() - qT0,
            });
          };

          for (let i = 0; i < total; i++) {
            const q = questions[i]!;
            await processQuestionAtIndex(i, q);
            await updateWorkflowJobProgress(instanceId, {
              step: `Questions ${i + 1} of ${total}`,
              percentage: Math.min(45 + Math.round(((i + 1) / total) * 50), 95),
            });
            if (i < total - 1 && interQuestionDelayMs > 0) {
              logDetail("screen.question.after_delay", {
                ms: interQuestionDelayMs,
                completedIndex: i + 1,
                total,
              });
              await sleep(interQuestionDelayMs);
            }
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
            interQuestionDelayMs,
            sequential: true,
          });
        }),
      );

      let commentSyncStatus: "not_requested" | "posted" | "failed" =
        postBitrixComment && bitrixDealId ? "failed" : "not_requested";
      if (postBitrixComment && bitrixDealId) {
        commentSyncStatus = await step.do(
          "post-bitrix-comment",
          { timeout: "5 minutes" },
          async () =>
            runDbWithWorkerNeonPool(async () => {
              try {
                const env = getBitrixSyncEnv();
                if (!env?.webhookBaseUrl) {
                  logDetail("bitrix.comment.skip_no_webhook", { bitrixDealId });
                  return "failed" as const;
                }
                const qaRows =
                  await getCimScreeningAnswersWithQuestionsByRunId(runId);
                const { comment, truncated } = buildBitrixTimelineCommentText({
                  runId,
                  screenerId,
                  sessionId,
                  qaRows,
                });
                if (truncated) {
                  logDetail("bitrix.comment.truncated", {
                    bitrixDealId,
                    postedChars: comment.length,
                  });
                }
                logDetail("bitrix.comment.posting", {
                  bitrixDealId,
                  questionCount: qaRows.length,
                  commentChars: comment.length,
                });
                await callBitrix("crm.timeline.comment.add", {
                  fields: {
                    ENTITY_ID: Number(bitrixDealId),
                    ENTITY_TYPE: "deal",
                    COMMENT: comment,
                  },
                });
                logDetail("bitrix.comment.posted_ok", { bitrixDealId });
                return "posted" as const;
              } catch (err) {
                logError("bitrix.comment.failed", err, { bitrixDealId, runId });
                return "failed" as const;
              }
            }),
        );
      }

      const out = {
        success: true as const,
        sessionId,
        runId,
        commentSyncStatus,
      };
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
