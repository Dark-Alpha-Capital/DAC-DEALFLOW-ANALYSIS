import { db } from "..";
import { projectTrackers, projectKickoffs } from "../schema";
import { eq } from "drizzle-orm";
import type { DepartmentValue } from "../schema";

export async function insertProjectTracker(values: {
  id: string;
  name: string;
  content: string;
  createdBy: string | null;
}) {
  const [created] = await db.insert(projectTrackers).values(values).returning();
  return created ?? null;
}

export async function deleteProjectTracker(
  trackerId: string,
  sourceId: string | null,
) {
  if (sourceId) {
    await db.delete(projectKickoffs).where(eq(projectKickoffs.id, sourceId));
  }
  await db.delete(projectTrackers).where(eq(projectTrackers.id, trackerId));
}

export async function updateProjectKickoffById(
  kickoffId: string,
  values: {
    projectName: string;
    department: DepartmentValue | null;
    projectOwners: string | null;
    engineeringLead: string | null;
    productDirection: string | null;
    objectives: string;
    platformEnables: string | null;
    keyDeliverables: string | null;
    risksAndBlockers: string | null;
    timeline: string | null;
    chosenTool: string | null;
    techStack: string | null;
    definitionOfDone: string | null;
    additionalNotes: string | null;
  },
) {
  await db
    .update(projectKickoffs)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(projectKickoffs.id, kickoffId));
}
