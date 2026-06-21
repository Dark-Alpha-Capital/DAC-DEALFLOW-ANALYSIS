import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { workflowJobs } from "./schema";

export type WorkflowKind = "project-kickoff-screen";

export interface InsertWorkflowJobInput {
  instanceId: string;
  workflowKind: WorkflowKind;
  userId: string | null;
  dealId?: string | null;
  fileName?: string | null;
  screenerId?: string | null;
}

function workflowJobInsertValues(row: InsertWorkflowJobInput) {
  return {
    instanceId: row.instanceId,
    workflowKind: row.workflowKind,
    userId: row.userId ?? null,
    dealId: row.dealId ?? null,
    fileName: row.fileName ?? null,
    screenerId: row.screenerId ?? null,
    state: "waiting" as const,
    progressPercent: 0,
    progressStep: null,
    failedReason: null,
    returnValue: null,
    attemptsMade: 0,
    updatedAt: new Date(),
  };
}

export async function insertWorkflowJob(row: InsertWorkflowJobInput) {
  await db
    .insert(workflowJobs)
    .values(workflowJobInsertValues(row))
    .onConflictDoNothing({ target: workflowJobs.instanceId });
}

export function insertWorkflowJobStatement(
  conn: Pick<typeof db, "insert">,
  row: InsertWorkflowJobInput,
) {
  return conn
    .insert(workflowJobs)
    .values(workflowJobInsertValues(row))
    .onConflictDoNothing({ target: workflowJobs.instanceId });
}

/** @deprecated Prefer `insertWorkflowJobStatement` + `db.batch` on D1. */
export async function insertWorkflowJobTx(
  tx: Pick<typeof db, "insert">,
  row: InsertWorkflowJobInput,
) {
  await insertWorkflowJobStatement(tx, row);
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
      returnValue:
        extra?.returnValue != null ? JSON.stringify(extra.returnValue) : null,
      updatedAt: new Date(),
    })
    .where(eq(workflowJobs.instanceId, instanceId));
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
