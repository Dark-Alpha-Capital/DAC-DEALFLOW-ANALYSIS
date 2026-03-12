import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  createChatSessionForUser,
  deleteChatSessionForUser,
  listRecentChatSessionsForUser,
  updateChatSessionContext,
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

  create: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id as string;
    return createChatSessionForUser(userId);
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

  updateContext: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        companyId: z.string().nullable().optional(),
        leadId: z.string().nullable().optional(),
        dealOpportunityId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      return updateChatSessionContext({
        userId,
        chatId: input.chatId,
        context: {
          companyId: input.companyId ?? null,
          leadId: input.leadId ?? null,
          dealOpportunityId: input.dealOpportunityId ?? null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      return deleteChatSessionForUser(userId, input.chatId);
    }),
});
