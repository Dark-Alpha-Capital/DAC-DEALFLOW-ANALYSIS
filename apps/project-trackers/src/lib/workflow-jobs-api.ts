import { env } from "cloudflare:workers";
import {
  getWorkflowJobRow,
  type WorkflowKind,
} from "@repo/db-tracker/workflow-jobs";
import type { ProjectKickoffScreenParams } from "../workflows/workflow-env";
import type { JobStatus } from "./workflow-jobs-types";

type WorkflowInstanceApi = {
  status(): Promise<{ status: string }>;
};

type WorkflowBinding = {
  get(id: string): Promise<WorkflowInstanceApi>;
  create(options: { id: string; params: ProjectKickoffScreenParams }): Promise<unknown>;
};

export function mapCfStatusToJobState(cf: string | undefined): JobStatus {
  switch (cf) {
    case "queued":
      return "waiting";
    case "running":
      return "active";
    case "complete":
      return "completed";
    case "failed":
      return "failed";
    case "waiting":
    case "waitingForPause":
      return "waiting";
    case "terminated":
    case "errored":
      return "failed";
    default:
      return "waiting";
  }
}

export async function fetchCfInstanceStatus(
  instanceId: string,
): Promise<string | undefined> {
  try {
    const w = env.PROJECT_KICKOFF_SCREEN_WORKFLOW as WorkflowBinding;
    const instance = await w.get(instanceId);
    const { status } = await instance.status();
    return status;
  } catch {
    return undefined;
  }
}

export async function getJobStatus(
  kind: WorkflowKind,
  instanceId: string,
): Promise<{
  state: JobStatus;
  progress?: { step: string; percentage: number };
  failedReason?: string | null;
  returnValue?: unknown;
}> {
  if (kind !== "project-kickoff-screen") {
    throw new Error(`Unknown workflow kind: ${kind}`);
  }

  const row = await getWorkflowJobRow(instanceId);
  const cfStatus = await fetchCfInstanceStatus(instanceId);
  const state = row?.state ?? mapCfStatusToJobState(cfStatus);

  return {
    state: state as JobStatus,
    progress:
      row?.progressStep != null
        ? {
          step: row.progressStep,
          percentage: row.progressPercent ?? 0,
        }
        : undefined,
    failedReason: row?.failedReason,
    returnValue: row?.returnValue ? JSON.parse(row.returnValue) : undefined,
  };
}

export async function startProjectKickoffScreenWorkflow(
  jobId: string,
  params: ProjectKickoffScreenParams,
) {
  await (env.PROJECT_KICKOFF_SCREEN_WORKFLOW as WorkflowBinding).create({
    id: jobId,
    params,
  });
}
