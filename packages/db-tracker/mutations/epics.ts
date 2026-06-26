import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { EpicStatusValue } from "@repo/enums";
import { db } from "..";
import { epics, type EpicStatusValue as SchemaEpicStatusValue } from "../schema";
import { getEpicById } from "../queries/epics";

export type CreateEpicInput = {
  trackerId: string;
  title: string;
  description?: string;
  status?: EpicStatusValue;
  startDate?: Date | null;
  dueDate?: Date | null;
  sortOrder?: number;
  createdBy: string;
};

export async function createEpic(input: CreateEpicInput) {
  const id = createId();
  const now = new Date();

  await db.insert(epics).values({
    id,
    trackerId: input.trackerId,
    title: input.title.trim(),
    description: input.description ?? "",
    status: (input.status ?? "ACTIVE") as SchemaEpicStatusValue,
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    sortOrder: input.sortOrder ?? 0,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  return getEpicById(id);
}

export type UpdateEpicInput = {
  epicId: string;
  title?: string;
  description?: string;
  status?: EpicStatusValue;
  startDate?: Date | null;
  dueDate?: Date | null;
  sortOrder?: number;
};

export async function updateEpic(input: UpdateEpicInput) {
  const existing = await getEpicById(input.epicId);
  if (!existing) return null;

  const patch: Partial<typeof epics.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) patch.status = input.status as SchemaEpicStatusValue;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  await db.update(epics).set(patch).where(eq(epics.id, input.epicId));
  return getEpicById(input.epicId);
}

export async function deleteEpic(epicId: string) {
  const existing = await getEpicById(epicId);
  if (!existing) return false;
  await db.delete(epics).where(eq(epics.id, epicId));
  return true;
}
