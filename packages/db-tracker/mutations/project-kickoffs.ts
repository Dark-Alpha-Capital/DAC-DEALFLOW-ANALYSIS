import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "..";
import {
  projectKickoffs,
  projectTrackers,
  projectKickoffScreenings,
  type DepartmentValue,
} from "../schema";
import { insertWorkflowJobStatement } from "../workflow-jobs";

export type ProjectKickoffFieldValues = {
  projectName: string;
  department: DepartmentValue | null;
  projectOwners: string | null;
  productDirection: string | null;
  engineeringLead: string | null;
  objectives: string;
  platformEnables: string | null;
  keyDeliverables: string | null;
  risksAndBlockers: string | null;
  raciMatrix: string | null;
  timeline: string | null;
  chosenTool: string | null;
  techStack: string | null;
  definitionOfDone: string | null;
  additionalNotes: string | null;
  structuredData?: unknown;
  rawText?: string | null;
};

export type CreateProjectKickoffInput = {
  fields: ProjectKickoffFieldValues;
  userId: string;
};

export type CreateProjectKickoffResult = {
  kickoffId: string;
  trackerId: string;
  screeningId: string;
  jobId: string;
};

export async function createProjectKickoff(
  input: CreateProjectKickoffInput,
): Promise<CreateProjectKickoffResult> {
  const kickoffId = createId();
  const trackerId = createId();
  const screeningId = createId();
  const jobId = createId();
  const { rawText, structuredData, ...fields } = input.fields;

  // D1 does not support SQL BEGIN/COMMIT; use batch for atomic multi-write.
  await db.batch([
    db.insert(projectKickoffs).values({
      id: kickoffId,
      ...fields,
      structuredData:
        structuredData != null ? JSON.stringify(structuredData) : null,
      rawText: rawText?.trim() || null,
      userId: input.userId,
    }),
    db.insert(projectTrackers).values({
      id: trackerId,
      name: fields.projectName,
      sourceType: "PROJECT_KICKOFF",
      kickoffId,
      createdBy: input.userId,
    }),
    insertWorkflowJobStatement(db, {
      instanceId: jobId,
      workflowKind: "project-kickoff-screen",
      userId: input.userId,
    }),
    db.insert(projectKickoffScreenings).values({
      id: screeningId,
      kickoffId,
      workflowInstanceId: jobId,
      status: "pending",
    }),
  ]);

  return { kickoffId, trackerId, screeningId, jobId };
}

export async function markProjectKickoffScreeningFailed(screeningId: string) {
  await db
    .update(projectKickoffScreenings)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(projectKickoffScreenings.id, screeningId));
}

export async function createProjectKickoffRescreen(input: {
  kickoffId: string;
  userId: string;
}): Promise<{ screeningId: string; jobId: string }> {
  const screeningId = createId();
  const jobId = createId();

  await db.batch([
    insertWorkflowJobStatement(db, {
      instanceId: jobId,
      workflowKind: "project-kickoff-screen",
      userId: input.userId,
    }),
    db.insert(projectKickoffScreenings).values({
      id: screeningId,
      kickoffId: input.kickoffId,
      workflowInstanceId: jobId,
      status: "pending",
    }),
  ]);

  return { screeningId, jobId };
}

export async function updateProjectKickoffById(
  kickoffId: string,
  fields: ProjectKickoffFieldValues,
) {
  const { rawText, structuredData, ...rest } = fields;

  await db.batch([
    db
      .update(projectKickoffs)
      .set({
        ...rest,
        structuredData:
          structuredData != null ? JSON.stringify(structuredData) : null,
        ...(rawText !== undefined ? { rawText: rawText?.trim() || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projectKickoffs.id, kickoffId)),
    db
      .update(projectTrackers)
      .set({ name: rest.projectName })
      .where(eq(projectTrackers.kickoffId, kickoffId)),
  ]);
}

export async function deleteProjectKickoff(kickoffId: string) {
  await db.delete(projectKickoffs).where(eq(projectKickoffs.id, kickoffId));
}
