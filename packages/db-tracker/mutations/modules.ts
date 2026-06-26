import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { ModuleStatusValue } from "@repo/enums";
import { db } from "..";
import {
  modules,
  type ModuleStatusValue as SchemaModuleStatusValue,
} from "../schema";
import { getModuleById } from "../queries/modules";

export type CreateModuleInput = {
  trackerId: string;
  name: string;
  description?: string;
  leadUserId?: string | null;
  sortOrder?: number;
};

export async function createModule(input: CreateModuleInput) {
  const id = createId();
  const now = new Date();

  await db.insert(modules).values({
    id,
    trackerId: input.trackerId,
    name: input.name.trim(),
    description: input.description ?? "",
    status: "ACTIVE" as SchemaModuleStatusValue,
    leadUserId: input.leadUserId ?? null,
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  return getModuleById(id);
}

export type UpdateModuleInput = {
  moduleId: string;
  name?: string;
  description?: string;
  status?: ModuleStatusValue;
  leadUserId?: string | null;
  sortOrder?: number;
};

export async function updateModule(input: UpdateModuleInput) {
  const existing = await getModuleById(input.moduleId);
  if (!existing) return null;

  const patch: Partial<typeof modules.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) patch.status = input.status as SchemaModuleStatusValue;
  if (input.leadUserId !== undefined) patch.leadUserId = input.leadUserId;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  await db.update(modules).set(patch).where(eq(modules.id, input.moduleId));
  return getModuleById(input.moduleId);
}

export async function deleteModule(moduleId: string) {
  const existing = await getModuleById(moduleId);
  if (!existing) return false;
  await db.delete(modules).where(eq(modules.id, moduleId));
  return true;
}
