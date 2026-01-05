import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { pocs } from "db";
import { DeletePOCById } from "db/mutations";
import { revalidatePath } from "next/cache";

const createPocSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  workPhone: z.string().optional(),
});

export const pocsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createPocSchema)
    .mutation(async ({ input }) => {
      const [newPoc] = await db
        .insert(pocs)
        .values({
          name: input.name,
          email: input.email,
          workPhone: input.workPhone,
          dealId: input.dealId,
        })
        .returning();

      revalidatePath(`/raw-deals/${input.dealId}`);
      revalidatePath(`/manual-deals/${input.dealId}`);

      return { poc: newPoc };
    }),

  delete: protectedProcedure
    .input(z.object({ pocId: z.string(), dealId: z.string() }))
    .mutation(async ({ input }) => {
      await DeletePOCById(input.pocId);

      revalidatePath(`/raw-deals/${input.dealId}`);
      revalidatePath(`/manual-deals/${input.dealId}`);

      return { success: true };
    }),
});
