import {
  setWorkflowJobState,
  updateWorkflowJobProgress,
} from "@repo/db-tracker/workflow-jobs";
import type { ProgressReporter } from "@repo/rag-engine";

export function workflowProgressReporter(
  instanceId: string,
): ProgressReporter {
  return {
    async updateProgress(data: { step?: string; percentage?: number }) {
      await updateWorkflowJobProgress(instanceId, {
        step: data.step ?? "",
        percentage: data.percentage ?? 0,
      });
    },
  };
}

export async function markWorkflowRunning(instanceId: string) {
  await setWorkflowJobState(instanceId, "active");
}

export async function markWorkflowCompleted(
  instanceId: string,
  returnValue?: unknown,
) {
  await setWorkflowJobState(instanceId, "completed", { returnValue });
}

export async function markWorkflowFailed(instanceId: string, err: unknown) {
  const failedReason =
    err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  await setWorkflowJobState(instanceId, "failed", { failedReason });
}
