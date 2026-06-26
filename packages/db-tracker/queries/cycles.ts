import { eq, asc } from "drizzle-orm";
import { db } from "..";
import { cycles, workItems } from "../schema";

export type CycleRecord = typeof cycles.$inferSelect;

export type CycleWithStats = CycleRecord & {
  totalItems: number;
  completedItems: number;
};

export async function getCyclesByTrackerId(
  trackerId: string,
): Promise<CycleWithStats[]> {
  const rows = await db
    .select()
    .from(cycles)
    .where(eq(cycles.trackerId, trackerId))
    .orderBy(asc(cycles.startDate), asc(cycles.sortOrder));

  const cycleIds = rows.map((c) => c.id);

  const counts = await Promise.all(
    cycleIds.map(async (cycleId) => {
      const items = await db
        .select({ status: workItems.status })
        .from(workItems)
        .where(eq(workItems.cycleId, cycleId));
      return {
        cycleId,
        total: items.length,
        completed: items.filter((i) => i.status === "DONE").length,
      };
    }),
  );

  const countMap = new Map(counts.map((c) => [c.cycleId, c]));

  return rows.map((row) => {
    const c = countMap.get(row.id);
    return {
      ...row,
      totalItems: c?.total ?? 0,
      completedItems: c?.completed ?? 0,
    };
  });
}

export async function getActiveCycleByTrackerId(
  trackerId: string,
): Promise<CycleWithStats | null> {
  const [row] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.trackerId, trackerId))
    .limit(1)
    .orderBy(asc(cycles.startDate));

  const all = await getCyclesByTrackerId(trackerId);
  return all.find((c) => c.status === "ACTIVE") ?? null;
}

export async function getCycleById(
  cycleId: string,
): Promise<CycleWithStats | null> {
  const [row] = await db
    .select()
    .from(cycles)
    .where(eq(cycles.id, cycleId))
    .limit(1);
  if (!row) return null;

  const items = await db
    .select({ status: workItems.status })
    .from(workItems)
    .where(eq(workItems.cycleId, cycleId));

  return {
    ...row,
    totalItems: items.length,
    completedItems: items.filter((i) => i.status === "DONE").length,
  };
}
