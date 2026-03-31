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

export class CimExtractionWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  CimExtractionParams
> {
  async run(
    event: WorkflowEvent<CimExtractionParams>,
    step: WorkflowStep,
  ): Promise<{ success: boolean }> {
    return runDbWithWorkerNeonPool(async () => {
      const instanceId = event.instanceId;
      const { simId, documentId, dealOpportunityId, filePath } = event.payload;

      try {
        await markWorkflowRunning(instanceId);
        await step.do(
          "cim-extract",
          { timeout: "30 minutes" },
          async () => {
            await updateWorkflowJobProgress(instanceId, {
              step: "Fetching CIM file",
              percentage: 15,
            });

            const fileBuffer = (await getFileContents(filePath)) as Buffer;

            await updateWorkflowJobProgress(instanceId, {
              step: "Extracting PDF text",
              percentage: 35,
            });
            const rawText = await extractTextFromPdf(fileBuffer);

            await updateWorkflowJobProgress(instanceId, {
              step: "Running LLM extraction",
              percentage: 55,
            });
            const payload = await runCIMExtractionLLM(rawText);

            await updateWorkflowJobProgress(instanceId, {
              step: "Saving extraction",
              percentage: 90,
            });
            await upsertCIMExtraction({
              simId,
              documentId: documentId ?? undefined,
              dealOpportunityId: dealOpportunityId ?? undefined,
              payload,
              modelName: "gpt-4o-mini",
              version: "1",
            });

            await updateWorkflowJobProgress(instanceId, {
              step: "Completed",
              percentage: 100,
            });
            return { success: true as const };
          },
        );

        await markWorkflowCompleted(instanceId, { success: true });
        return { success: true };
      } catch (err) {
        await markWorkflowFailed(instanceId, err);
        throw err;
      }
    });
  }
}
