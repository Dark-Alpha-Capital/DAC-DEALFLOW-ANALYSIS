import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "..";
import { workLogs } from "../schema";

export type CreateWorkLogInput = {
  workItemId: string;
  hours: number;
  description?: string;
  loggedAt?: Date;
  userId: string;
};

export async function createWorkLog(input: CreateWorkLogInput) {
  const id = createId();
  const now = new Date();

  await db.insert(workLogs).values({
    id,
    workItemId: input.workItemId,
    hours: input.hours,
    description: input.description ?? "",
    loggedAt: input.loggedAt ?? now,
    userId: input.userId,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db
    .select()
    .from(workLogs)
    .where(eq(workLogs.id, id))
    .limit(1);
  return row ?? null;
}

export type UpdateWorkLogInput = {
  logId: string;
  hours?: number;
  description?: string;
  loggedAt?: Date;
};

export async function updateWorkLog(input: UpdateWorkLogInput) {
  const [existing] = await db
    .select()
    .from(workLogs)
    .where(eq(workLogs.id, input.logId))
    .limit(1);
  if (!existing) return null;

  const patch: Partial<typeof workLogs.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.hours !== undefined) patch.hours = input.hours;
  if (input.description !== undefined) patch.description = input.description;
  if (input.loggedAt !== undefined) patch.loggedAt = input.loggedAt;

  await db.update(workLogs).set(patch).where(eq(workLogs.id, input.logId));

  const [row] = await db
    .select()
    .from(workLogs)
    .where(eq(workLogs.id, input.logId))
    .limit(1);
  return row ?? null;
}

export async function deleteWorkLog(logId: string) {
  const [existing] = await db
    .select()
    .from(workLogs)
    .where(eq(workLogs.id, logId))
    .limit(1);
  if (!existing) return false;
  await db.delete(workLogs).where(eq(workLogs.id, logId));
  return true;
}
