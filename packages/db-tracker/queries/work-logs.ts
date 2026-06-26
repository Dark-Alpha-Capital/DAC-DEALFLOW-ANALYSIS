import { eq, desc } from "drizzle-orm";
import { db } from "..";
import { workLogs } from "../schema";

export type WorkLogRecord = typeof workLogs.$inferSelect;

export async function getWorkLogsByWorkItemId(
  workItemId: string,
): Promise<WorkLogRecord[]> {
  return db
    .select()
    .from(workLogs)
    .where(eq(workLogs.workItemId, workItemId))
    .orderBy(desc(workLogs.loggedAt));
}

export async function getTotalHoursByWorkItemId(
  workItemId: string,
): Promise<number> {
  const rows = await db
    .select({ hours: workLogs.hours })
    .from(workLogs)
    .where(eq(workLogs.workItemId, workItemId));
  return rows.reduce((sum, r) => sum + r.hours, 0);
}
