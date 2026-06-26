import { z } from "zod";

export const createWorkItemCommentSchema = z.object({
  workItemId: z.string().min(1),
  content: z.string().trim().min(1).max(50000),
  parentCommentId: z.string().nullable().optional(),
});

export const updateWorkItemCommentSchema = z.object({
  commentId: z.string().min(1),
  content: z.string().trim().min(1).max(50000),
});

export type CreateWorkItemCommentInput = z.infer<
  typeof createWorkItemCommentSchema
>;
export type UpdateWorkItemCommentInput = z.infer<
  typeof updateWorkItemCommentSchema
>;
