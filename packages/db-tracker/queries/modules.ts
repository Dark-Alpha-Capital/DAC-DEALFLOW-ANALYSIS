import { eq, asc } from "drizzle-orm";
import { db } from "..";
import { modules, workItems } from "../schema";

export type ModuleRecord = typeof modules.$inferSelect;

export type ModuleWithCounts = ModuleRecord & {
  workItemCount: number;
};

export async function getModulesByTrackerId(
  trackerId: string,
): Promise<ModuleWithCounts[]> {
  const rows = await db
    .select()
    .from(modules)
    .where(eq(modules.trackerId, trackerId))
    .orderBy(asc(modules.sortOrder), asc(modules.createdAt));

  const moduleIds = rows.map((m) => m.id);

  const counts = await Promise.all(
    moduleIds.map(async (moduleId) => {
      const items = await db
        .select({ id: workItems.id })
        .from(workItems)
        .where(eq(workItems.moduleId, moduleId));
      return { moduleId, count: items.length };
    }),
  );

  const countMap = new Map(counts.map((c) => [c.moduleId, c.count]));

  return rows.map((row) => ({
    ...row,
    workItemCount: countMap.get(row.id) ?? 0,
  }));
}

export async function getModuleById(
  moduleId: string,
): Promise<ModuleWithCounts | null> {
  const [row] = await db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);
  if (!row) return null;

  const items = await db
    .select({ id: workItems.id })
    .from(workItems)
    .where(eq(workItems.moduleId, moduleId));

  return { ...row, workItemCount: items.length };
}
