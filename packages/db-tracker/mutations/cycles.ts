import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import type { CycleStatusValue } from "@repo/enums";
import { db } from "..";
import {
  cycles,
  workItems,
  type CycleStatusValue as SchemaCycleStatusValue,
} from "../schema";
import { getCycleById } from "../queries/cycles";

export type CreateCycleInput = {
  trackerId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  sortOrder?: number;
  createdBy: string;
};

export async function createCycle(input: CreateCycleInput) {
  const id = createId();
  const now = new Date();

  await db.insert(cycles).values({
    id,
    trackerId: input.trackerId,
    name: input.name.trim(),
    description: input.description ?? "",
    startDate: input.startDate,
    endDate: input.endDate,
    status: "UPCOMING" as SchemaCycleStatusValue,
    sortOrder: input.sortOrder ?? 0,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  return getCycleById(id);
}

export type UpdateCycleInput = {
  cycleId: string;
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: CycleStatusValue;
  sortOrder?: number;
};

export async function updateCycle(input: UpdateCycleInput) {
  const existing = await getCycleById(input.cycleId);
  if (!existing) return null;

  const patch: Partial<typeof cycles.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.endDate !== undefined) patch.endDate = input.endDate;
  if (input.status !== undefined) patch.status = input.status as SchemaCycleStatusValue;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  await db.update(cycles).set(patch).where(eq(cycles.id, input.cycleId));
  return getCycleById(input.cycleId);
}

export async function completeCycle(
  cycleId: string,
  targetCycleId: string | null,
) {
  const existing = await getCycleById(cycleId);
  if (!existing) return null;

  const now = new Date();

  if (targetCycleId) {
    await db
      .update(workItems)
      .set({ cycleId: targetCycleId, updatedAt: now })
      .where(
        and(
          eq(workItems.cycleId, cycleId),
          eq(workItems.status, "TODO"),
        ),
      );
  }

  await db
    .update(cycles)
    .set({ status: "COMPLETED" as SchemaCycleStatusValue, updatedAt: now })
    .where(eq(cycles.id, cycleId));

  return getCycleById(cycleId);
}

export async function deleteCycle(cycleId: string) {
  const existing = await getCycleById(cycleId);
  if (!existing) return false;
  await db.delete(cycles).where(eq(cycles.id, cycleId));
  return true;
}
