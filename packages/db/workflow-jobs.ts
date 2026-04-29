import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { workflowJobs } from "./schema";

export type WorkflowKind =
  | "screen-deal"
  | "file-upload"
  | "cim-extraction"
  | "rag-ingestion"
  | "cim-screening"
  | "cim-monograph-screening"
  | "ic-scorer-score";

export interface InsertWorkflowJobInput {
  instanceId: string;
  workflowKind: WorkflowKind;
  userId: string | null;
  dealId?: string | null;
  fileName?: string | null;
  screenerId?: string | null;
}

export async function insertWorkflowJob(row: InsertWorkflowJobInput) {
  await db
    .insert(workflowJobs)
    .values({
      instanceId: row.instanceId,
      workflowKind: row.workflowKind,
      userId: row.userId ?? null,
      dealId: row.dealId ?? null,
      fileName: row.fileName ?? null,
      screenerId: row.screenerId ?? null,
      state: "waiting",
      progressPercent: 0,
      progressStep: null,
      failedReason: null,
      returnValue: null,
      attemptsMade: 0,
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: workflowJobs.instanceId });
}

export async function updateWorkflowJobProgress(
  instanceId: string,
  progress: { step: string; percentage: number },
) {
  await db
    .update(workflowJobs)
    .set({
      progressStep: progress.step,
      progressPercent: progress.percentage,
      state: "active",
      updatedAt: new Date(),
    })
    .where(eq(workflowJobs.instanceId, instanceId));
}

export async function setWorkflowJobState(
  instanceId: string,
  state: "waiting" | "active" | "completed" | "failed" | "delayed",
  extra?: {
    failedReason?: string | null;
    returnValue?: unknown;
  },
) {
  await db
    .update(workflowJobs)
    .set({
      state,
      failedReason: extra?.failedReason ?? null,
      returnValue: extra?.returnValue ?? null,
      updatedAt: new Date(),
    })
    .where(eq(workflowJobs.instanceId, instanceId));
}

export async function markWorkflowJobCancelled(instanceId: string) {
  await setWorkflowJobState(instanceId, "failed", {
    failedReason: "Cancelled",
  });
}

export async function getWorkflowJobRow(instanceId: string) {
  const [row] = await db
    .select()
    .from(workflowJobs)
    .where(eq(workflowJobs.instanceId, instanceId))
    .limit(1);
  return row ?? null;
}

export async function listWorkflowJobsForUser(userId: string, limit = 1000) {
  return db
    .select()
    .from(workflowJobs)
    .where(eq(workflowJobs.userId, userId))
    .orderBy(desc(workflowJobs.createdAt))
    .limit(limit);
}

export async function deleteWorkflowJobRow(instanceId: string) {
  await db.delete(workflowJobs).where(eq(workflowJobs.instanceId, instanceId));
}
