import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getCommentsByWorkItemId,
  threadComments,
} from "@repo/db-tracker/queries";
import {
  createWorkItemComment,
  updateWorkItemComment,
  deleteWorkItemComment,
} from "@repo/db-tracker/mutations";
import {
  createWorkItemCommentSchema,
  updateWorkItemCommentSchema,
} from "@repo/schemas";

export const workItemCommentsRouter = createTRPCRouter({
  listByWorkItem: protectedProcedure
    .input(z.object({ workItemId: z.string().min(1) }))
    .query(async ({ input }) => {
      const comments = await getCommentsByWorkItemId(input.workItemId);
      return threadComments(comments);
    }),

  create: protectedProcedure
    .input(createWorkItemCommentSchema)
    .mutation(async ({ ctx, input }) => {
      return createWorkItemComment({
        workItemId: input.workItemId,
        content: input.content,
        parentCommentId: input.parentCommentId ?? null,
        userId: ctx.user.id,
      });
    }),

  update: protectedProcedure
    .input(updateWorkItemCommentSchema)
    .mutation(async ({ input }) => {
      const updated = await updateWorkItemComment({
        commentId: input.commentId,
        content: input.content,
      });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteWorkItemComment(input.commentId);
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }
      return { success: true };
    }),
});
