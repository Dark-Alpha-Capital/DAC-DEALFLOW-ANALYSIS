import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  deleteChatSessionForUser,
  listRecentChatSessionsForUser,
  updateChatSessionTitle,
} from "@/lib/chat-store";

export const chatsRouter = createTRPCRouter({
  listRecent: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      const limit = input?.limit ?? 50;
      return listRecentChatSessionsForUser(userId, limit);
    }),

  updateTitle: protectedProcedure
    .input(z.object({ chatId: z.string(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      return updateChatSessionTitle({
        userId,
        chatId: input.chatId,
        title: input.title,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      return deleteChatSessionForUser(userId, input.chatId);
    }),
});
