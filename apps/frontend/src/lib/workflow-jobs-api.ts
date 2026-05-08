import { env } from "cloudflare:workers";

type WorkflowInstanceApi = {
  status(): Promise<{ status: string }>;
  terminate(): Promise<void>;
};

type WorkflowBinding = {
  get(id: string): Promise<WorkflowInstanceApi>;
};
import {
  deleteWorkflowJobRow,
  getWorkflowJobRow,
  insertWorkflowJob,
  listWorkflowJobsForUser,
  type WorkflowKind,
} from "@repo/db/workflow-jobs";
import type {
  CimMonographScreeningParams,
  CimExtractionParams,
  FileUploadParams,
  IcScorerWorkflowParams,
  RagIngestionParams,
  ScreenDealParams,
  CimScreeningParams,
} from "../workflows/workflow-env";
import type { JobProgressData, JobStatus, JobWithMetadata } from "@repo/redis-queue/types";
import { QUEUE_NAMES } from "@repo/redis-queue/types";

function getWorkflowByKind(kind: WorkflowKind): WorkflowBinding {
  switch (kind) {
    case QUEUE_NAMES.SCREEN_DEAL:
      return env.SCREEN_DEAL_WORKFLOW as WorkflowBinding;
    case QUEUE_NAMES.FILE_UPLOAD:
      return env.FILE_UPLOAD_WORKFLOW as WorkflowBinding;
    case QUEUE_NAMES.CIM_EXTRACTION:
      return env.CIM_EXTRACTION_WORKFLOW as WorkflowBinding;
    case QUEUE_NAMES.RAG_INGESTION:
      return env.RAG_INGESTION_WORKFLOW as WorkflowBinding;
    case QUEUE_NAMES.CIM_SCREENING:
      return env.CIM_SCREENING_WORKFLOW as WorkflowBinding;
    case QUEUE_NAMES.CIM_MONOGRAPH_SCREENING:
      return env.CIM_MONOGRAPH_SCREENING_WORKFLOW as WorkflowBinding;
    case QUEUE_NAMES.IC_SCORER_SCORE:
      return env.IC_SCORER_WORKFLOW as WorkflowBinding;
    default:
      throw new Error(`Unknown workflow kind: ${kind}`);
  }
}

/** Map Cloudflare Workflow instance status to BullMQ-shaped UI state */
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
  kind: WorkflowKind,
  instanceId: string,
): Promise<string | undefined> {
  try {
    const w = getWorkflowByKind(kind);
    const instance = await w.get(instanceId);
    const details = await instance.status();
    return details.status;
  } catch {
    return undefined;
  }
}

export async function terminateWorkflowInstance(
  kind: WorkflowKind,
  instanceId: string,
): Promise<void> {
  const w = getWorkflowByKind(kind);
  const instance = await w.get(instanceId);
  await instance.terminate();
}

/** Re-run the workflow from the beginning with the same instance id and original event payload. */
export async function restartWorkflowInstance(
  kind: WorkflowKind,
  instanceId: string,
): Promise<void> {
  const w = getWorkflowByKind(kind);
  const instance = await w.get(instanceId);
  await (instance as unknown as { restart: () => Promise<void> }).restart();
}

function rowToMetadata(
  row: NonNullable<Awaited<ReturnType<typeof getWorkflowJobRow>>>,
  state: JobStatus,
  cfStatus?: string,
): JobWithMetadata {
  const progress: JobProgressData | null =
    row.progressStep != null
      ? {
          step: row.progressStep,
          percentage: row.progressPercent ?? 0,
        }
      : null;

  return {
    jobId: row.instanceId,
    queueName: row.workflowKind as JobWithMetadata["queueName"],
    state,
    progress,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    returnvalue: row.returnValue ?? undefined,
    failedReason: row.failedReason,
    attemptsMade: row.attemptsMade ?? 0,
    userId: row.userId,
    dealId: row.dealId ?? undefined,
    fileName: row.fileName ?? undefined,
    screenerId: row.screenerId ?? undefined,
  };
}

export async function getAllUserJobs(userId: string): Promise<JobWithMetadata[]> {
  const rows = await listWorkflowJobsForUser(userId);
  const out: JobWithMetadata[] = [];
  for (const row of rows) {
    const cf = await fetchCfInstanceStatus(
      row.workflowKind as WorkflowKind,
      row.instanceId,
    );
    const state =
      cf !== undefined ? mapCfStatusToJobState(cf) : (row.state as JobStatus);
    out.push(rowToMetadata(row, state, cf));
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLatestUserJobs(
  userId: string,
  limit = 5,
): Promise<JobWithMetadata[]> {
  const all = await getAllUserJobs(userId);
  return all.slice(0, limit);
}

export async function getJobStatus(
  queueName: string,
  jobId: string,
): Promise<{
  jobId: string;
  state: JobStatus;
  progress: JobProgressData | undefined;
  returnvalue: unknown;
  failedReason: string | undefined;
} | null> {
  const row = await getWorkflowJobRow(jobId);
  if (!row || row.workflowKind !== queueName) return null;

  const cf = await fetchCfInstanceStatus(queueName as WorkflowKind, jobId);
  const state =
    cf !== undefined ? mapCfStatusToJobState(cf) : (row.state as JobStatus);

  const progress: JobProgressData | undefined =
    row.progressStep != null
      ? {
          step: row.progressStep,
          percentage: row.progressPercent ?? 0,
        }
      : undefined;

  return {
    jobId,
    state,
    progress,
    returnvalue: row.returnValue ?? undefined,
    failedReason: row.failedReason ?? undefined,
  };
}

/** Single job for a user (avoids scanning all jobs). */
export async function getJobByIdForUser(
  userId: string,
  queueName: string,
  jobId: string,
): Promise<JobWithMetadata | null> {
  const row = await getWorkflowJobRow(jobId);
  if (!row || row.userId !== userId || row.workflowKind !== queueName) {
    return null;
  }
  const cf = await fetchCfInstanceStatus(queueName as WorkflowKind, jobId);
  const state =
    cf !== undefined ? mapCfStatusToJobState(cf) : (row.state as JobStatus);
  return rowToMetadata(row, state, cf);
}

export async function deleteUserJob(
  userId: string,
  jobId: string,
  queueName: string,
): Promise<boolean> {
  const row = await getWorkflowJobRow(jobId);
  if (!row || row.userId !== userId) {
    throw new Error("Job not found or does not belong to user");
  }
  try {
    await terminateWorkflowInstance(queueName as WorkflowKind, jobId);
  } catch {
    // Instance may already be complete / missing
  }
  await deleteWorkflowJobRow(jobId);
  return true;
}

// ——— Triggers (call after insertWorkflowJob from routers) ———

export async function startScreenDealWorkflow(
  jobId: string,
  params: ScreenDealParams,
) {
  await env.SCREEN_DEAL_WORKFLOW.create({ id: jobId, params });
}

export async function startFileUploadWorkflow(
  jobId: string,
  params: FileUploadParams,
) {
  await env.FILE_UPLOAD_WORKFLOW.create({ id: jobId, params });
}

export async function startCimExtractionWorkflow(
  jobId: string,
  params: CimExtractionParams,
) {
  await env.CIM_EXTRACTION_WORKFLOW.create({ id: jobId, params });
}

export async function startRagIngestionWorkflow(
  jobId: string,
  params: RagIngestionParams,
) {
  await env.RAG_INGESTION_WORKFLOW.create({ id: jobId, params });
}

export async function startCimScreeningWorkflow(
  jobId: string,
  params: CimScreeningParams,
) {
  await env.CIM_SCREENING_WORKFLOW.create({ id: jobId, params });
}

export async function startCimMonographScreeningWorkflow(
  jobId: string,
  params: CimMonographScreeningParams,
) {
  await env.CIM_MONOGRAPH_SCREENING_WORKFLOW.create({ id: jobId, params });
}

export async function startIcScorerWorkflow(
  jobId: string,
  params: IcScorerWorkflowParams,
) {
  await env.IC_SCORER_WORKFLOW.create({ id: jobId, params });
}

export { insertWorkflowJob };
export type { WorkflowKind };
