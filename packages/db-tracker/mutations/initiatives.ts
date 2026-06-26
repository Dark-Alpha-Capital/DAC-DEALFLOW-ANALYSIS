import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import type { InitiativeStatusValue } from "@repo/enums";
import { db } from "..";
import {
  initiatives,
  initiativeTrackers,
  type InitiativeStatusValue as SchemaInitiativeStatusValue,
} from "../schema";
import { getInitiativeById } from "../queries/initiatives";

export type CreateInitiativeInput = {
  name: string;
  description?: string;
  status?: InitiativeStatusValue;
  startDate?: Date | null;
  targetDate?: Date | null;
  color?: string | null;
  createdBy: string;
};

export async function createInitiative(input: CreateInitiativeInput) {
  const id = createId();
  const now = new Date();

  await db.insert(initiatives).values({
    id,
    name: input.name.trim(),
    description: input.description ?? "",
    status: (input.status ?? "ACTIVE") as SchemaInitiativeStatusValue,
    startDate: input.startDate ?? null,
    targetDate: input.targetDate ?? null,
    color: input.color ?? null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  return getInitiativeById(id);
}

export type UpdateInitiativeInput = {
  initiativeId: string;
  name?: string;
  description?: string;
  status?: InitiativeStatusValue;
  startDate?: Date | null;
  targetDate?: Date | null;
  color?: string | null;
};

export async function updateInitiative(input: UpdateInitiativeInput) {
  const existing = await getInitiativeById(input.initiativeId);
  if (!existing) return null;

  const patch: Partial<typeof initiatives.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) patch.status = input.status as SchemaInitiativeStatusValue;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.targetDate !== undefined) patch.targetDate = input.targetDate;
  if (input.color !== undefined) patch.color = input.color;

  await db
    .update(initiatives)
    .set(patch)
    .where(eq(initiatives.id, input.initiativeId));
  return getInitiativeById(input.initiativeId);
}

export async function linkTrackerToInitiative(
  initiativeId: string,
  trackerId: string,
) {
  const existing = await db
    .select()
    .from(initiativeTrackers)
    .where(
      and(
        eq(initiativeTrackers.initiativeId, initiativeId),
        eq(initiativeTrackers.trackerId, trackerId),
      ),
    )
    .limit(1);

  if (existing.length > 0) return true;

  await db.insert(initiativeTrackers).values({
    initiativeId,
    trackerId,
  });

  return true;
}

export async function unlinkTrackerFromInitiative(
  initiativeId: string,
  trackerId: string,
) {
  await db
    .delete(initiativeTrackers)
    .where(
      and(
        eq(initiativeTrackers.initiativeId, initiativeId),
        eq(initiativeTrackers.trackerId, trackerId),
      ),
    );
  return true;
}

export async function deleteInitiative(initiativeId: string) {
  const existing = await getInitiativeById(initiativeId);
  if (!existing) return false;
  await db.delete(initiatives).where(eq(initiatives.id, initiativeId));
  return true;
}
