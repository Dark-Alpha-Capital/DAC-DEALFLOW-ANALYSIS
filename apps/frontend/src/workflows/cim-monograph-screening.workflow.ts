import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { generateText, Output } from "ai";
import db, { and, asc, eq, runDbWithD1 } from "@repo/db";
import { documentChunks, documents } from "@repo/db/schema";
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
import { updateWorkflowJobProgress } from "@repo/db/workflow-jobs";
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
  CimMonographScreeningParams,
  CimScreeningDealListingContextSource,
  WorkflowWorkerEnv,
} from "./workflow-env";
import {
  buildBitrixTimelineCommentText,
  CIM_SCREENING_MODEL,
  getInterQuestionDelayMs,
  SCREENING_ANSWER_SCHEMA,
  sleep,
} from "./cim-screening-core";

const LOG = "[CimMonographScreeningWorkflow]";
const QUESTION_PREVIEW_MAX = 120;

function cimMonographInterQuestionDelayMs(): number {
  return getInterQuestionDelayMs("CIM_SCREENING_INTER_QUESTION_DELAY_MS", 350);
}

function monographMaxChars(): number {
  const raw = process.env.CIM_MONOGRAPH_MAX_CHARS?.trim();
  if (!raw) return 120_000;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 10_000) return 120_000;
  return Math.min(500_000, n);
}

function logDetail(phase: string, data: Record<string, unknown> = {}): void {
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

function buildMonographExcerpts(
  chunks: Array<{ id: string; chunkText: string | null }>,
  maxChars: number,
): {
  excerpts: string;
  includedChunkIds: string[];
  truncated: boolean;
} {
  const valid = chunks
    .filter((c) => c.chunkText && c.chunkText.trim().length > 0)
    .map((c) => ({ id: c.id, text: c.chunkText!.trim() }));
  if (valid.length === 0) {
    return {
      excerpts: "No text excerpts were retrieved for this document.",
      includedChunkIds: [],
      truncated: false,
    };
  }

  const parts: string[] = [];
  const ids: string[] = [];
  let used = 0;
  let truncated = false;
  for (let i = 0; i < valid.length; i++) {
    const chunk = valid[i]!;
    const prefix = `[Excerpt ${i + 1}]\n`;
    const body = chunk.text;
    const block = `${prefix}${body}`;
    const cost = (parts.length > 0 ? 2 : 0) + block.length;
    if (used + cost > maxChars) {
      truncated = true;
      break;
    }
    parts.push(block);
    ids.push(chunk.id);
    used += cost;
  }

  const note = truncated
    ? "\n\n[Note: document context truncated to fit prompt budget]"
    : "";
  return {
    excerpts: `${parts.join("\n\n")}${note}`,
    includedChunkIds: ids,
    truncated,
  };
}

export class CimMonographScreeningWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  CimMonographScreeningParams
> {
  async run(
    event: WorkflowEvent<CimMonographScreeningParams>,
    step: WorkflowStep,
  ): Promise<{ success: boolean; sessionId: string }> {
    const instanceId = event.instanceId;
    const {
      userId,
      dealOpportunityId,
      targetDocumentId,
      screenerId,
      sessionId,
      runId,
      bitrixDealId,
      postBitrixComment,
      dealListingContextSource: payloadListingSource,
      bitrixLiveDealListingContext,
    } = event.payload;

    const effectiveListingSource =
      payloadListingSource ?? ("deal_opportunity_db" as const);

    try {
      await runDbWithD1(this.env.DB, async () => markWorkflowRunning(instanceId));

      await step.do("validate-monograph-document", async () =>
        runDbWithD1(this.env.DB, async () => {
          await updateCimScreeningRun(runId, { status: "INGESTING" });
          await updateWorkflowJobProgress(instanceId, {
            step: "Validating selected document",
            percentage: 10,
          });

          const [document] = await db
            .select({
              id: documents.id,
              uploadedById: documents.uploadedById,
              dealOpportunityId: documents.dealOpportunityId,
              ingestionStatus: documents.ingestionStatus,
              fileName: documents.fileName,
            })
            .from(documents)
            .where(eq(documents.id, targetDocumentId))
            .limit(1);

          if (!document) throw new Error(`Document ${targetDocumentId} not found`);
          if (
            userId?.trim() &&
            document.uploadedById &&
            document.uploadedById !== userId
          ) {
            throw new Error("Document does not belong to this user");
          }
          if (document.dealOpportunityId !== dealOpportunityId) {
            throw new Error("Selected document is not attached to this deal");
          }
          if (document.ingestionStatus !== "PROCESSED") {
            throw new Error(
              "Document is not indexed yet. Wait for ingestion to complete, then retry.",
            );
          }

          const chunkRows = await db
            .select({ id: documentChunks.id })
            .from(documentChunks)
            .where(
              and(
                eq(documentChunks.dealOpportunityId, dealOpportunityId),
                eq(documentChunks.documentId, targetDocumentId),
              ),
            )
            .limit(1);
          if (chunkRows.length === 0) {
            throw new Error(
              "No chunks found for selected file. Re-ingest the document and try again.",
            );
          }
          logDetail("validate.ok", {
            dealOpportunityId,
            targetDocumentId,
            fileName: document.fileName,
          });
        }),
      );

      await step.do("screen-monograph-questions", async () =>
        runDbWithD1(this.env.DB, async () => {
          await updateCimScreeningRun(runId, { status: "SCREENING" });
          await updateWorkflowJobProgress(instanceId, {
            step: "Loading screener questions",
            percentage: 40,
          });

          const chunkRows = await db
            .select({ id: documentChunks.id, chunkText: documentChunks.chunkText })
            .from(documentChunks)
            .where(
              and(
                eq(documentChunks.dealOpportunityId, dealOpportunityId),
                eq(documentChunks.documentId, targetDocumentId),
              ),
            )
            .orderBy(asc(documentChunks.createdAt));

          const maxChars = monographMaxChars();
          const { excerpts, includedChunkIds, truncated } = buildMonographExcerpts(
            chunkRows,
            maxChars,
          );
          logDetail("monograph.context", {
            dealOpportunityId,
            targetDocumentId,
            totalChunks: chunkRows.length,
            includedChunks: includedChunkIds.length,
            maxChars,
            truncated,
          });

          let dealListingContextForPrompt: string | null = null;
          const listing = await loadDealListingForScreeningPrompt({
            dealOppId: dealOpportunityId,
            effectiveListingSource,
            bitrixLiveDealListingContext,
          });
          dealListingContextForPrompt = listing.text;

          const questions = await getScreenerQuestions(screenerId);
          if (!questions.length) throw new Error("Screener has no questions");
          const total = questions.length;
          const interQuestionDelayMs = cimMonographInterQuestionDelayMs();

          for (let i = 0; i < total; i++) {
            const q = questions[i]!;
            const qPreview =
              q.question.length > QUESTION_PREVIEW_MAX
                ? `${q.question.slice(0, QUESTION_PREVIEW_MAX)}…`
                : q.question;
            logDetail("screen.question.start", {
              questionId: q.id,
              index: i + 1,
              total,
              questionPreview: qPreview,
            });

            const prompt = buildCimScreeningQuestionPrompt({
              question: q.question,
              excerpts,
              dealListingContext: dealListingContextForPrompt,
            });

            const { output } = await generateText({
              model: getOpenAIProvider()(CIM_SCREENING_MODEL),
              prompt,
              output: Output.object({
                schema: SCREENING_ANSWER_SCHEMA,
              }),
            });
            if (!output) {
              throw new Error("CIM monograph screening produced no structured output");
            }
            const score = Math.round(Math.min(10, Math.max(0, output.score)));
            await upsertCimScreeningAnswer({
              runId,
              questionId: q.id,
              score,
              rationale: output.rationale,
              evidenceChunkIds: includedChunkIds,
            });
            await updateWorkflowJobProgress(instanceId, {
              step: `Questions ${i + 1} of ${total}`,
              percentage: Math.min(45 + Math.round(((i + 1) / total) * 50), 95),
            });
            if (i < total - 1 && interQuestionDelayMs > 0) {
              await sleep(interQuestionDelayMs);
            }
          }

          await updateCimScreeningRun(runId, { status: "COMPLETED" });
          await updateWorkflowJobProgress(instanceId, {
            step: "Completed",
            percentage: 100,
          });
        }),
      );

      let commentSyncStatus: "not_requested" | "posted" | "failed" =
        postBitrixComment && bitrixDealId ? "failed" : "not_requested";
      if (postBitrixComment && bitrixDealId) {
        commentSyncStatus = await step.do("post-bitrix-comment", async () =>
          runDbWithD1(this.env.DB, async () => {
            try {
              const env = getBitrixSyncEnv();
              if (!env?.webhookBaseUrl) return "failed" as const;
              const qaRows =
                await getCimScreeningAnswersWithQuestionsByRunId(runId);
              const { comment } = buildBitrixTimelineCommentText({
                runId,
                screenerId,
                sessionId,
                qaRows,
              });
              await callBitrix("crm.timeline.comment.add", {
                fields: {
                  ENTITY_ID: Number(bitrixDealId),
                  ENTITY_TYPE: "deal",
                  COMMENT: comment,
                },
              });
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
      await runDbWithD1(this.env.DB, async () =>
        markWorkflowCompleted(instanceId, out),
      );
      return out;
    } catch (err) {
      logError("run.failed", err, {
        instanceId,
        sessionId,
        runId,
        dealOpportunityId,
        targetDocumentId,
      });
      const message = err instanceof Error ? err.message : String(err);
      try {
        await runDbWithD1(this.env.DB, async () =>
          updateCimScreeningRun(runId, {
            status: "FAILED",
            errorMessage: message,
          }),
        );
      } catch {
        // ignore
      }
      await runDbWithD1(this.env.DB, async () =>
        markWorkflowFailed(instanceId, err),
      );
      throw err;
    }
  }
}
