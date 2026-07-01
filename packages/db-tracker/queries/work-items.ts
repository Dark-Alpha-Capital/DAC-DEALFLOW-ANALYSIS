import { eq, asc, desc, inArray } from "drizzle-orm";
import { db } from "..";
import { workItems, workItemAssignees, workItemEvents, users } from "../schema";

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
  priority: (typeof workItems.$inferSelect)["priority"];
  startDate: Date | null;
  dueDate: Date | null;
  estimatePoints: number | null;
  estimateHours: number | null;
  sequence: number | null;
  tags: string[];
  assignees: string[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapWorkItem(
  row: typeof workItems.$inferSelect,
  assignees: string[],
): WorkItemRecord {
  return {
    ...row,
    tags: parseWorkItemTags(row.tags),
    assignees,
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

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const assigneeRows = await db
    .select()
    .from(workItemAssignees)
    .where(inArray(workItemAssignees.workItemId, ids));

  const byItem = new Map<string, string[]>();
  for (const a of assigneeRows) {
    const list = byItem.get(a.workItemId) ?? [];
    list.push(a.userId);
    byItem.set(a.workItemId, list);
  }

  return rows.map((r) => mapWorkItem(r, byItem.get(r.id) ?? []));
}

export async function getWorkItemById(workItemId: string) {
  const [row] = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, workItemId))
    .limit(1);

  if (!row) return null;

  const assigneeRows = await db
    .select()
    .from(workItemAssignees)
    .where(eq(workItemAssignees.workItemId, workItemId));

  return mapWorkItem(
    row,
    assigneeRows.map((a) => a.userId),
  );
}

export type WorkItemEventRecord = {
  id: string;
  kind: string;
  detail: string;
  createdAt: Date;
  userId: string | null;
  userName: string | null;
};

export async function getWorkItemEvents(
  workItemId: string,
): Promise<WorkItemEventRecord[]> {
  return db
    .select({
      id: workItemEvents.id,
      kind: workItemEvents.kind,
      detail: workItemEvents.detail,
      createdAt: workItemEvents.createdAt,
      userId: workItemEvents.userId,
      userName: users.name,
    })
    .from(workItemEvents)
    .leftJoin(users, eq(workItemEvents.userId, users.id))
    .where(eq(workItemEvents.workItemId, workItemId))
    .orderBy(desc(workItemEvents.createdAt));
}
