import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { generateObject } from "ai";
import { z } from "zod";
import db, { eq, runDbWithWorkerNeonPool, sql } from "@repo/db";
import { documents, documentChunks } from "@repo/db/schema";
import {
  getScreenerQuestions,
  SearchDocumentChunks,
} from "@repo/db/queries";
import {
  updateSimScreeningSession,
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
    const { userId, documentId, screenerId, sessionId } = event.payload;

    try {
      await runDbWithWorkerNeonPool(async () => markWorkflowRunning(instanceId));

      await step.do("validate-and-ingest", { timeout: "30 minutes" }, async () =>
        runDbWithWorkerNeonPool(async () => {
          let ingestStarted = false;
          try {
            await updateSimScreeningSession(sessionId, { status: "INGESTING" });
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
              throw new Error(`Document ${documentId} not found`);
            }
            if (document.uploadedById !== userId) {
              throw new Error("Document does not belong to this user");
            }
            if (document.category !== "SIM_SCREENING") {
              throw new Error("Document is not a SIM screening upload");
            }

            await updateWorkflowJobProgress(instanceId, {
              step: "Fetching SIM file",
              percentage: 15,
            });

            const filePath = extractFilePathFromUrl(document.fileUrl);
            if (!filePath) {
              throw new Error("Could not resolve storage path from document.fileUrl");
            }

            const fileBuffer = await getFileContents(filePath);
            const normalizedMime = resolveMimeType(
              document.fileName,
              document.mimeType,
            );

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

            await db
              .delete(documentChunks)
              .where(eq(documentChunks.documentId, documentId));

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
            const processResult: ProcessResult = await processContent(
              buf,
              normalizedMime,
              docContext,
              metadataBase,
              reporter,
              { forcePdfTextChunks: true },
            );

            if ("unsupported" in processResult) {
              const reason =
                processResult.reason ?? `Unsupported mime type: ${normalizedMime}`;
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

            const chunkRows = processResult.chunks;
            if (!chunkRows.length) {
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

            await updateWorkflowJobProgress(instanceId, {
              step: "Persisting embeddings",
              percentage: 40,
            });
            await db.insert(documentChunks).values(chunkRows);

            await db
              .update(documents)
              .set({
                ingestionStatus: "PROCESSED",
                ingestionCompletedAt: new Date(),
                ingestionError: null,
              })
              .where(eq(documents.id, documentId));

            return { chunksInserted: chunkRows.length };
          } catch (ingestErr) {
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
          await updateSimScreeningSession(sessionId, { status: "SCREENING" });
          await updateWorkflowJobProgress(instanceId, {
            step: "Loading screener questions",
            percentage: 45,
          });

          const questions = await getScreenerQuestions(screenerId);
          if (!questions.length) {
            throw new Error("Screener has no questions");
          }

          const total = questions.length;
          for (let i = 0; i < total; i++) {
            const q = questions[i]!;
            const pct = 45 + Math.round(((i + 1) / total) * 50);
            await updateWorkflowJobProgress(instanceId, {
              step: `Question ${i + 1} of ${total}`,
              percentage: Math.min(pct, 95),
            });

            const queryEmbedding = await getEmbedding(q.question);
            if (!queryEmbedding?.length) {
              throw new Error("Failed to embed screener question");
            }

            const hits = await SearchDocumentChunks({
              queryEmbedding,
              limit: RETRIEVAL_TOP_K,
              documentId,
            });

            const textHits = hits.filter(
              (h) => h.chunkText && h.chunkText.trim().length > 0,
            );
            const excerpts =
              textHits.length > 0
                ? textHits
                  .map(
                    (h, idx) =>
                      `[Excerpt ${idx + 1}]\n${h.chunkText!.trim()}`,
                  )
                  .join("\n\n")
                : "No text excerpts were retrieved for this question.";

            const prompt = buildSimScreeningQuestionPrompt({
              question: q.question,
              excerpts,
            });

            const { object } = await generateObject({
              model: openai("gpt-4o-mini"),
              schema: z.object({
                score: z.number().min(0).max(10),
                rationale: z.string(),
              }),
              prompt,
            });

            const score = Math.round(
              Math.min(10, Math.max(0, object.score)),
            );

            await upsertSimScreeningAnswer({
              sessionId,
              questionId: q.id,
              score,
              rationale: object.rationale,
              evidenceChunkIds: textHits.map((h) => h.id),
            });
          }

          await updateSimScreeningSession(sessionId, { status: "COMPLETED" });
          await updateWorkflowJobProgress(instanceId, {
            step: "Completed",
            percentage: 100,
          });
        }),
      );

      const out = { success: true as const, sessionId };
      await runDbWithWorkerNeonPool(async () =>
        markWorkflowCompleted(instanceId, out),
      );
      return out;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        await runDbWithWorkerNeonPool(async () =>
          updateSimScreeningSession(sessionId, {
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
