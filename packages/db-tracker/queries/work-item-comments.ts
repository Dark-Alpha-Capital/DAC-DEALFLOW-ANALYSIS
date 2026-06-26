import { eq, asc, isNull } from "drizzle-orm";
import { db } from "..";
import { workItemComments } from "../schema";

export type WorkItemCommentRecord = typeof workItemComments.$inferSelect;

export async function getCommentsByWorkItemId(
  workItemId: string,
): Promise<WorkItemCommentRecord[]> {
  return db
    .select()
    .from(workItemComments)
    .where(eq(workItemComments.workItemId, workItemId))
    .orderBy(asc(workItemComments.createdAt));
}

export async function getCommentById(
  commentId: string,
): Promise<WorkItemCommentRecord | null> {
  const [row] = await db
    .select()
    .from(workItemComments)
    .where(eq(workItemComments.id, commentId))
    .limit(1);
  return row ?? null;
}

export type ThreadedComment = WorkItemCommentRecord & {
  replies: ThreadedComment[];
};

export function threadComments(
  comments: WorkItemCommentRecord[],
): ThreadedComment[] {
  const map = new Map<string, ThreadedComment>();
  const roots: ThreadedComment[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parentCommentId && map.has(c.parentCommentId)) {
      map.get(c.parentCommentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
