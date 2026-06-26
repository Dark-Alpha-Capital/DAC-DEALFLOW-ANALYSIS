import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { WorkItemStatusValue } from "@repo/enums";
import { db } from "..";
import { workItems, type WorkItemStatusValue as SchemaWorkItemStatusValue } from "../schema";
import { getWorkItemById, serializeWorkItemTags } from "../queries/work-items";

export type CreateWorkItemInput = {
  trackerId: string;
  title: string;
  description?: string;
  status?: WorkItemStatusValue;
  epicId?: string | null;
  cycleId?: string | null;
  moduleId?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimatePoints?: number | null;
  estimateHours?: number | null;
  tags?: string[];
  createdBy: string;
};

export async function createWorkItem(input: CreateWorkItemInput) {
  const id = createId();
  const now = new Date();

  await db.insert(workItems).values({
    id,
    trackerId: input.trackerId,
    title: input.title.trim(),
    description: input.description ?? "",
    status: (input.status ?? "TODO") as SchemaWorkItemStatusValue,
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

  const created = await getWorkItemById(id);
  if (!created) throw new Error("Failed to create work item");
  return created;
}

export type UpdateWorkItemInput = {
  workItemId: string;
  title?: string;
  description?: string;
  status?: WorkItemStatusValue;
  epicId?: string | null;
  cycleId?: string | null;
  moduleId?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimatePoints?: number | null;
  estimateHours?: number | null;
  tags?: string[];
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

  return getWorkItemById(input.workItemId);
}

export async function deleteWorkItem(workItemId: string) {
  const existing = await getWorkItemById(workItemId);
  if (!existing) return false;

  await db.delete(workItems).where(eq(workItems.id, workItemId));
  return true;
}
