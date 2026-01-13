import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { DeleteScreenerById } from "db/mutations";
import { getAllScreenersWithContent } from "db/queries";
import { revalidatePath } from "next/cache";

export const screenersRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    const screeners = await getAllScreenersWithContent();
    return screeners || [];
  }),

  delete: protectedProcedure
    .input(z.object({ screenerId: z.string() }))
    .mutation(async ({ input }) => {
      await DeleteScreenerById(input.screenerId);

      revalidatePath("/screeners");

      return { success: true };
    }),
});
