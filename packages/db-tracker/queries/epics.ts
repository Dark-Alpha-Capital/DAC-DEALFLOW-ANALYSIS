import { eq, asc } from "drizzle-orm";
import { db } from "..";
import { epics, workItems } from "../schema";

export type EpicRecord = typeof epics.$inferSelect;

export type EpicWithCount = EpicRecord & {
  workItemCount: number;
  completedWorkItemCount: number;
};

export async function getEpicsByTrackerId(
  trackerId: string,
): Promise<EpicWithCount[]> {
  const rows = await db
    .select()
    .from(epics)
    .where(eq(epics.trackerId, trackerId))
    .orderBy(asc(epics.sortOrder), asc(epics.createdAt));

  const epicIds = rows.map((e) => e.id);

  const counts = await Promise.all(
    epicIds.map(async (epicId) => {
      const items = await db
        .select({ status: workItems.status })
        .from(workItems)
        .where(eq(workItems.epicId, epicId));
      return {
        epicId,
        total: items.length,
        completed: items.filter((i) => i.status === "DONE").length,
      };
    }),
  );

  const countMap = new Map(counts.map((c) => [c.epicId, c]));

  return rows.map((row) => {
    const c = countMap.get(row.id);
    return {
      ...row,
      workItemCount: c?.total ?? 0,
      completedWorkItemCount: c?.completed ?? 0,
    };
  });
}

export async function getEpicById(epicId: string): Promise<EpicRecord | null> {
  const [row] = await db
    .select()
    .from(epics)
    .where(eq(epics.id, epicId))
    .limit(1);
  return row ?? null;
}
