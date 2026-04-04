import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { runDbWithWorkerNeonPool } from "@repo/db";
import { upsertCIMExtraction } from "@repo/db/mutations";
import { getFileContents } from "@repo/nextcloud";
import { extractTextFromPdf, runCIMExtractionLLM } from "@repo/cim-extraction";
import { updateWorkflowJobProgress } from "@repo/db/workflow-jobs";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type { CimExtractionParams, WorkflowWorkerEnv } from "./workflow-env";

const LOG = "[CimExtractionWorkflow]";

function describeBinaryPayload(
  data: Buffer | Uint8Array | ArrayBuffer,
): { kind: string; byteLength: number } {
  if (data instanceof ArrayBuffer) {
    return { kind: "ArrayBuffer", byteLength: data.byteLength };
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(data)) {
    return { kind: "Buffer", byteLength: data.length };
  }
  if (data instanceof Uint8Array) {
    return { kind: "Uint8Array", byteLength: data.byteLength };
  }
  return { kind: "unknown", byteLength: 0 };
}

export class CimExtractionWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  CimExtractionParams
> {
  async run(
    event: WorkflowEvent<CimExtractionParams>,
    step: WorkflowStep,
  ): Promise<{ success: boolean }> {
    const instanceId = event.instanceId;
    const { simId, documentId, dealOpportunityId, filePath } = event.payload;

    console.log(`${LOG} run() start`, {
      instanceId,
      simId,
      documentId: documentId ?? null,
      dealOpportunityId: dealOpportunityId ?? null,
      filePathSuffix: filePath?.slice(-80) ?? null,
    });

    try {
      await runDbWithWorkerNeonPool(async () => {
        console.log(`${LOG} markWorkflowRunning`, { instanceId });
        await markWorkflowRunning(instanceId);
      });

      await step.do(
        "cim-extract",
        { timeout: "30 minutes" },
        () =>
          runDbWithWorkerNeonPool(async () => {
            console.log(`${LOG} step "cim-extract" entered`, { instanceId });

            await updateWorkflowJobProgress(instanceId, {
              step: "Fetching CIM file",
              percentage: 15,
            });
            console.log(`${LOG} progress 15% — Fetching CIM file`, {
              filePathSuffix: filePath?.slice(-80) ?? null,
            });

            const fileBuffer = await getFileContents(filePath);
            const binInfo = describeBinaryPayload(fileBuffer);
            console.log(`${LOG} getFileContents done`, binInfo);
            if (binInfo.byteLength === 0) {
              throw new Error(
                `${LOG} Nextcloud returned empty body for path (check path and permissions)`,
              );
            }

            await updateWorkflowJobProgress(instanceId, {
              step: "Extracting PDF text",
              percentage: 35,
            });
            console.log(`${LOG} progress 35% — Extracting PDF text`);
            const rawText = await extractTextFromPdf(fileBuffer);
            console.log(`${LOG} extractTextFromPdf done`, {
              charLength: rawText?.length ?? 0,
            });

            await updateWorkflowJobProgress(instanceId, {
              step: "Running LLM extraction",
              percentage: 55,
            });
            console.log(`${LOG} progress 55% — Running LLM extraction`);
            const payload = await runCIMExtractionLLM(rawText);
            console.log(`${LOG} runCIMExtractionLLM done`, {
              topLevelKeys:
                payload && typeof payload === "object"
                  ? Object.keys(payload as object)
                  : typeof payload,
            });

            await updateWorkflowJobProgress(instanceId, {
              step: "Saving extraction",
              percentage: 90,
            });
            console.log(`${LOG} progress 90% — upsertCIMExtraction`, {
              simId,
              documentId: documentId ?? null,
              dealOpportunityId: dealOpportunityId ?? null,
            });
            await upsertCIMExtraction({
              simId,
              documentId: documentId ?? undefined,
              dealOpportunityId: dealOpportunityId ?? undefined,
              payload,
              modelName: "gpt-4o-mini",
              version: "1",
            });
            console.log(`${LOG} upsertCIMExtraction done`);

            await updateWorkflowJobProgress(instanceId, {
              step: "Completed",
              percentage: 100,
            });
            console.log(`${LOG} step "cim-extract" finished OK`, {
              instanceId,
            });
            return { success: true as const };
          }),
      );

      console.log(`${LOG} markWorkflowCompleted`, { instanceId });
      await runDbWithWorkerNeonPool(async () => {
        await markWorkflowCompleted(instanceId, { success: true });
      });
      console.log(`${LOG} run() success`, { instanceId });
      return { success: true };
    } catch (err) {
      console.error(`${LOG} run() error`, {
        instanceId,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      try {
        await runDbWithWorkerNeonPool(async () => {
          await markWorkflowFailed(instanceId, err);
        });
      } catch {
        // ignore secondary failure
      }
      throw err;
    }
  }
}
