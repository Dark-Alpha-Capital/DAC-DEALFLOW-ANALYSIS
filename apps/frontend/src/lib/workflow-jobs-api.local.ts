import {
  deleteWorkflowJobRow,
  getWorkflowJobRow,
  insertWorkflowJob,
  listWorkflowJobsForUser,
  setWorkflowJobState,
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

const LOG_PREFIX = "[local-workflow]";

function logNoop(kind: string, jobId: string): void {
  console.warn(`${LOG_PREFIX} ${kind} trigger: Cloudflare Workflows not available in local dev. Job ${jobId} will not execute.`);
}

export function mapCfStatusToJobState(_cf: string | undefined): JobStatus {
  return "waiting";
}

export async function fetchCfInstanceStatus(
  _kind: WorkflowKind,
  _instanceId: string,
): Promise<string | undefined> {
  return undefined;
}

export async function terminateWorkflowInstance(
  _kind: WorkflowKind,
  _instanceId: string,
): Promise<void> {
  logNoop("terminate", _instanceId);
}

export async function restartWorkflowInstance(
  _kind: WorkflowKind,
  _instanceId: string,
): Promise<void> {
  logNoop("restart", _instanceId);
}

function rowToMetadata(
  row: NonNullable<Awaited<ReturnType<typeof getWorkflowJobRow>>>,
  state: JobStatus,
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
  return rows
    .map((row) => rowToMetadata(row, (row.state as JobStatus) ?? "waiting"))
    .sort((a, b) => b.createdAt - a.createdAt);
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

  const progress: JobProgressData | undefined =
    row.progressStep != null
      ? {
          step: row.progressStep,
          percentage: row.progressPercent ?? 0,
        }
      : undefined;

  return {
    jobId,
    state: (row.state as JobStatus) ?? "waiting",
    progress,
    returnvalue: row.returnValue ?? undefined,
    failedReason: row.failedReason ?? undefined,
  };
}

export async function getJobByIdForUser(
  userId: string,
  queueName: string,
  jobId: string,
): Promise<JobWithMetadata | null> {
  const row = await getWorkflowJobRow(jobId);
  if (!row || row.userId !== userId || row.workflowKind !== queueName) {
    return null;
  }
  return rowToMetadata(row, (row.state as JobStatus) ?? "waiting");
}

export async function deleteUserJob(
  userId: string,
  jobId: string,
  _queueName: string,
): Promise<boolean> {
  const row = await getWorkflowJobRow(jobId);
  if (!row || row.userId !== userId) {
    throw new Error("Job not found or does not belong to user");
  }
  await deleteWorkflowJobRow(jobId);
  return true;
}

const LOCAL_FAIL_REASON = "Cloudflare Workflows not available in local dev mode";

export async function startScreenDealWorkflow(
  jobId: string,
  _params: ScreenDealParams,
) {
  logNoop("screen-deal", jobId);
  await setWorkflowJobState(jobId, "failed", { failedReason: LOCAL_FAIL_REASON });
}

export async function startFileUploadWorkflow(
  jobId: string,
  _params: FileUploadParams,
) {
  logNoop("file-upload", jobId);
  await setWorkflowJobState(jobId, "failed", { failedReason: LOCAL_FAIL_REASON });
}

export async function startCimExtractionWorkflow(
  jobId: string,
  _params: CimExtractionParams,
) {
  logNoop("cim-extraction", jobId);
  await setWorkflowJobState(jobId, "failed", { failedReason: LOCAL_FAIL_REASON });
}

export async function startRagIngestionWorkflow(
  jobId: string,
  _params: RagIngestionParams,
) {
  logNoop("rag-ingestion", jobId);
  await setWorkflowJobState(jobId, "failed", { failedReason: LOCAL_FAIL_REASON });
}

export async function startCimScreeningWorkflow(
  jobId: string,
  _params: CimScreeningParams,
) {
  logNoop("cim-screening", jobId);
  await setWorkflowJobState(jobId, "failed", { failedReason: LOCAL_FAIL_REASON });
}

export async function startCimMonographScreeningWorkflow(
  jobId: string,
  _params: CimMonographScreeningParams,
) {
  logNoop("cim-monograph-screening", jobId);
  await setWorkflowJobState(jobId, "failed", { failedReason: LOCAL_FAIL_REASON });
}

export async function startIcScorerWorkflow(
  jobId: string,
  _params: IcScorerWorkflowParams,
) {
  logNoop("ic-scorer", jobId);
  await setWorkflowJobState(jobId, "failed", { failedReason: LOCAL_FAIL_REASON });
}

export { insertWorkflowJob };
export type { WorkflowKind };
