import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { buildIcScorerUserPrompt } from "@repo/ai-core";
import { getBitrixSyncEnv } from "@repo/bitrix-sync";
import db, { runDbWithWorkerNeonPool } from "@repo/db";
import { updateWorkflowJobProgress } from "@repo/db/workflow-jobs";
import { getIcScorerRunById } from "@repo/db/queries";
import { updateIcScorerRun } from "@repo/db/mutations";
import { mergeIcScorerOutput, type IcScorerScoreCore } from "@repo/schemas";
import { fetchBitrixWidgetDealSnapshot } from "@/lib/server/bitrix-widget-deal-snapshot";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type { IcScorerWorkflowParams, WorkflowWorkerEnv } from "./workflow-env";
import { loadIcScorerEvidence } from "./ic-scorer-evidence";
import { generateIcScorerScoreCore } from "./ic-scorer-score-core";
import { generateIcScorerMemoPass } from "./ic-scorer-memo-core";

const LOG = "[IcScorerWorkflow]";

function icScorerActorMatches(
  runUserId: string | null | undefined,
  payloadUserId: string | null | undefined,
): boolean {
  const a = runUserId?.trim() || null;
  const b = payloadUserId?.trim() || null;
  return a === b;
}

export class IcScorerWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  IcScorerWorkflowParams
> {
  async run(
    event: WorkflowEvent<IcScorerWorkflowParams>,
    step: WorkflowStep,
  ): Promise<{ success: boolean; runId: string }> {
    const instanceId = event.instanceId;
    const p = event.payload;

    try {
      await runDbWithWorkerNeonPool(async () => markWorkflowRunning(instanceId));

      await step.do("score-core", async () =>
        runDbWithWorkerNeonPool(async () => {
          const existing = await getIcScorerRunById(p.runId);
          if (!existing || !icScorerActorMatches(existing.userId, p.userId)) {
            throw new Error("IC scorer run not found or forbidden");
          }

          await updateIcScorerRun(p.runId, { status: "SCORING" });
          await updateWorkflowJobProgress(instanceId, {
            step: "Loading evidence",
            percentage: 10,
          });

          const evidence = await loadIcScorerEvidence({
            db,
            dealOpportunityId: p.dealOpportunityId,
            mode: p.mode,
            targetDocumentId: p.targetDocumentId,
          });

          await updateWorkflowJobProgress(instanceId, {
            step: "Loading Bitrix fields",
            percentage: 25,
          });

          const bitrixEnv = getBitrixSyncEnv();
          const snap = await fetchBitrixWidgetDealSnapshot({
            dealId: p.bitrixDealId,
            webhookBaseUrl: bitrixEnv?.webhookBaseUrl,
          });
          const deal = snap?.rawDeal ?? {};
          const fieldCatalogRows = (snap?.fieldRows ?? []).map((r) => ({
            fieldId: r.fieldId,
            title: r.title ?? null,
            type: r.type ?? null,
          }));

          const userPrompt = buildIcScorerUserPrompt({
            dealId: p.bitrixDealId,
            deal,
            fieldCatalogRows,
            evidenceExcerpts: evidence.excerpts,
            dealListingContext: p.bitrixLiveDealListingContext,
          });

          await updateWorkflowJobProgress(instanceId, {
            step: "Scoring (LLM)",
            percentage: 50,
          });

          const core = await generateIcScorerScoreCore(userPrompt);

          await updateIcScorerRun(p.runId, {
            scorePayload: core,
            evidenceChunkIds: evidence.chunkIds,
            promptVersion: core.promptVersion,
            status: "MEMO",
          });

          await updateWorkflowJobProgress(instanceId, {
            step: "Score complete; drafting memo",
            percentage: 60,
          });
        }),
      );

      await step.do("memo-llm", async () =>
        runDbWithWorkerNeonPool(async () => {
          const run = await getIcScorerRunById(p.runId);
          if (!run || !icScorerActorMatches(run.userId, p.userId)) {
            throw new Error("IC scorer run not found or forbidden");
          }
          const scoreCore = run.scorePayload as IcScorerScoreCore | null;
          if (!scoreCore) {
            throw new Error("IC scorer run has no score payload");
          }

          await updateWorkflowJobProgress(instanceId, {
            step: "Drafting HTML memo",
            percentage: 75,
          });

          const chunkN = Array.isArray(run.evidenceChunkIds)
            ? run.evidenceChunkIds.length
            : 0;
          const evidenceSummary = `${run.mode} mode; ${chunkN} excerpt chunk(s) used in score step.`;

          const memo = await generateIcScorerMemoPass({
            scoreCore,
            evidenceSummary,
          });
          const output = mergeIcScorerOutput(scoreCore, memo);

          await updateIcScorerRun(p.runId, {
            output,
            status: "COMPLETED",
            promptVersion: memo.promptVersion,
          });

          await updateWorkflowJobProgress(instanceId, {
            step: "Complete",
            percentage: 100,
          });
        }),
      );

      await runDbWithWorkerNeonPool(async () =>
        markWorkflowCompleted(instanceId, { runId: p.runId }),
      );

      return { success: true, runId: p.runId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${LOG} failed`, { runId: p.runId, msg });
      await runDbWithWorkerNeonPool(async () => {
        await updateIcScorerRun(p.runId, {
          status: "FAILED",
          errorMessage: msg,
        });
        await markWorkflowFailed(instanceId, e);
      });
      throw e;
    }
  }
}
