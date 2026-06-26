import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "..";
import { workItemComments } from "../schema";

export type CreateWorkItemCommentInput = {
  workItemId: string;
  content: string;
  parentCommentId?: string | null;
  userId: string;
};

export async function createWorkItemComment(input: CreateWorkItemCommentInput) {
  const id = createId();
  const now = new Date();

  await db.insert(workItemComments).values({
    id,
    workItemId: input.workItemId,
    content: input.content,
    parentCommentId: input.parentCommentId ?? null,
    userId: input.userId,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db
    .select()
    .from(workItemComments)
    .where(eq(workItemComments.id, id))
    .limit(1);
  return row ?? null;
}

export type UpdateWorkItemCommentInput = {
  commentId: string;
  content: string;
};

export async function updateWorkItemComment(input: UpdateWorkItemCommentInput) {
  const [existing] = await db
    .select()
    .from(workItemComments)
    .where(eq(workItemComments.id, input.commentId))
    .limit(1);
  if (!existing) return null;

  const patch: Partial<typeof workItemComments.$inferInsert> = {
    content: input.content,
    updatedAt: new Date(),
  };

  await db
    .update(workItemComments)
    .set(patch)
    .where(eq(workItemComments.id, input.commentId));

  const [row] = await db
    .select()
    .from(workItemComments)
    .where(eq(workItemComments.id, input.commentId))
    .limit(1);
  return row ?? null;
}

export async function deleteWorkItemComment(commentId: string) {
  const [existing] = await db
    .select()
    .from(workItemComments)
    .where(eq(workItemComments.id, commentId))
    .limit(1);
  if (!existing) return false;
  await db.delete(workItemComments).where(eq(workItemComments.id, commentId));
  return true;
}
