import { eq, asc } from "drizzle-orm";
import { db } from "..";
import { workItems } from "../schema";

export function parseWorkItemTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
  } catch {
    return [];
  }
}

export function serializeWorkItemTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export type WorkItemRecord = {
  id: string;
  trackerId: string;
  epicId: string | null;
  cycleId: string | null;
  moduleId: string | null;
  title: string;
  description: string;
  status: (typeof workItems.$inferSelect)["status"];
  startDate: Date | null;
  dueDate: Date | null;
  estimatePoints: number | null;
  estimateHours: number | null;
  tags: string[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapWorkItem(row: typeof workItems.$inferSelect): WorkItemRecord {
  return {
    ...row,
    tags: parseWorkItemTags(row.tags),
  };
}

export async function getWorkItemsByTrackerId(
  trackerId: string,
): Promise<WorkItemRecord[]> {
  const rows = await db
    .select()
    .from(workItems)
    .where(eq(workItems.trackerId, trackerId))
    .orderBy(asc(workItems.createdAt));

  return rows.map(mapWorkItem);
}

export async function getWorkItemById(workItemId: string) {
  const [row] = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, workItemId))
    .limit(1);

  return row ? mapWorkItem(row) : null;
}
