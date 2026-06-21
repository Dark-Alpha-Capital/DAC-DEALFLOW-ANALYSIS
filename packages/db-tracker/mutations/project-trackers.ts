import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { ProjectStageValue } from "@repo/enums";
import { db } from "..";
import {
  projectTrackers,
  projectStageEvents,
  type ProjectStageValue as SchemaProjectStageValue,
} from "../schema";
import { deleteProjectKickoff } from "./project-kickoffs";

export async function deleteProjectTracker(kickoffId: string) {
  await deleteProjectKickoff(kickoffId);
}

export type UpdateProjectTrackerStageInput = {
  trackerId: string;
  stage: ProjectStageValue;
  changedBy: string;
  note?: string | null;
};

export async function updateProjectTrackerStage(
  input: UpdateProjectTrackerStageInput,
): Promise<{ stage: ProjectStageValue; stageChangedAt: Date } | null> {
  const [tracker] = await db
    .select({
      id: projectTrackers.id,
      stage: projectTrackers.stage,
      stageChangedAt: projectTrackers.stageChangedAt,
    })
    .from(projectTrackers)
    .where(eq(projectTrackers.id, input.trackerId))
    .limit(1);

  if (!tracker) return null;
  if (tracker.stage === input.stage) {
    return {
      stage: tracker.stage,
      stageChangedAt: tracker.stageChangedAt,
    };
  }

  const now = new Date();
  const eventId = createId();

  await db.batch([
    db
      .update(projectTrackers)
      .set({
        stage: input.stage as SchemaProjectStageValue,
        stageChangedAt: now,
      })
      .where(eq(projectTrackers.id, input.trackerId)),
    db.insert(projectStageEvents).values({
      id: eventId,
      trackerId: input.trackerId,
      fromStage: tracker.stage,
      toStage: input.stage as SchemaProjectStageValue,
      changedBy: input.changedBy,
      note: input.note?.trim() || null,
    }),
  ]);

  return { stage: input.stage, stageChangedAt: now };
}
