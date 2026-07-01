import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import type { WorkItemStatusValue, WorkItemPriorityValue } from "@repo/enums";
import { db } from "..";
import { workItems, workItemAssignees, workItemEvents, type WorkItemStatusValue as SchemaWorkItemStatusValue, type WorkItemPriorityValue as SchemaWorkItemPriorityValue } from "../schema";
import { getWorkItemById, serializeWorkItemTags } from "../queries/work-items";

async function replaceWorkItemAssignees(
  workItemId: string,
  userIds: string[],
): Promise<void> {
  await db
    .delete(workItemAssignees)
    .where(eq(workItemAssignees.workItemId, workItemId));
  if (userIds.length > 0) {
    const now = new Date();
    await db
      .insert(workItemAssignees)
      .values(userIds.map((userId) => ({ workItemId, userId, assignedAt: now })));
  }
}

async function logWorkItemEvent(
  workItemId: string,
  userId: string | null,
  kind: string,
  detail: string,
): Promise<void> {
  await db.insert(workItemEvents).values({
    id: createId(),
    workItemId,
    userId,
    kind,
    detail,
    createdAt: new Date(),
  });
}

export type CreateWorkItemInput = {
  trackerId: string;
  title: string;
  description?: string;
  status?: WorkItemStatusValue;
  priority?: WorkItemPriorityValue;
  epicId?: string | null;
  cycleId?: string | null;
  moduleId?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimatePoints?: number | null;
  estimateHours?: number | null;
  tags?: string[];
  assignees?: string[];
  createdBy: string;
};

export async function createWorkItem(input: CreateWorkItemInput) {
  const id = createId();
  const now = new Date();

  const seqRows = await db
    .select({ maxSeq: sql<number>`COALESCE(MAX(${workItems.sequence}), 0)` })
    .from(workItems)
    .where(eq(workItems.trackerId, input.trackerId));
  const sequence = (seqRows[0]?.maxSeq ?? 0) + 1;

  await db.insert(workItems).values({
    id,
    trackerId: input.trackerId,
    sequence,
    title: input.title.trim(),
    description: input.description ?? "",
    status: (input.status ?? "TODO") as SchemaWorkItemStatusValue,
    priority: (input.priority ?? "NONE") as SchemaWorkItemPriorityValue,
    epicId: input.epicId ?? null,
    cycleId: input.cycleId ?? null,
    moduleId: input.moduleId ?? null,
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    estimatePoints: input.estimatePoints ?? null,
    estimateHours: input.estimateHours ?? null,
    tags: serializeWorkItemTags(input.tags ?? []),
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  if (input.assignees?.length) {
    await replaceWorkItemAssignees(id, input.assignees);
  }

  await logWorkItemEvent(id, input.createdBy, "created", "");

  const created = await getWorkItemById(id);
  if (!created) throw new Error("Failed to create work item");
  return created;
}

export type UpdateWorkItemInput = {
  workItemId: string;
  title?: string;
  description?: string;
  status?: WorkItemStatusValue;
  priority?: WorkItemPriorityValue;
  epicId?: string | null;
  cycleId?: string | null;
  moduleId?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimatePoints?: number | null;
  estimateHours?: number | null;
  tags?: string[];
  assignees?: string[];
  actorId?: string;
};

export async function updateWorkItem(input: UpdateWorkItemInput) {
  const existing = await getWorkItemById(input.workItemId);
  if (!existing) return null;

  const patch: Partial<typeof workItems.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) {
    patch.status = input.status as SchemaWorkItemStatusValue;
  }
  if (input.priority !== undefined) {
    patch.priority = input.priority as SchemaWorkItemPriorityValue;
  }
  if (input.epicId !== undefined) patch.epicId = input.epicId;
  if (input.cycleId !== undefined) patch.cycleId = input.cycleId;
  if (input.moduleId !== undefined) patch.moduleId = input.moduleId;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
  if (input.estimatePoints !== undefined) patch.estimatePoints = input.estimatePoints;
  if (input.estimateHours !== undefined) patch.estimateHours = input.estimateHours;
  if (input.tags !== undefined) {
    patch.tags = serializeWorkItemTags(input.tags);
  }

  await db
    .update(workItems)
    .set(patch)
    .where(eq(workItems.id, input.workItemId));

  if (input.assignees !== undefined) {
    await replaceWorkItemAssignees(input.workItemId, input.assignees);
  }

  const actor = input.actorId ?? null;
  if (input.status !== undefined && input.status !== existing.status) {
    await logWorkItemEvent(input.workItemId, actor, "status", input.status);
  }
  if (input.priority !== undefined && input.priority !== existing.priority) {
    await logWorkItemEvent(input.workItemId, actor, "priority", input.priority);
  }
  if (input.title !== undefined && input.title.trim() !== existing.title) {
    await logWorkItemEvent(input.workItemId, actor, "title", input.title.trim());
  }

  return getWorkItemById(input.workItemId);
}

export async function deleteWorkItem(workItemId: string) {
  const existing = await getWorkItemById(workItemId);
  if (!existing) return false;

  await db.delete(workItems).where(eq(workItems.id, workItemId));
  return true;
}
