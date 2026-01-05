import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { companies } from "db";
import { DeleteCompanyById } from "db/mutations";
import { revalidatePath } from "next/cache";

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.string().url("Invalid URL").optional(),
  sector: z.string().optional(),
  stage: z
    .enum(["STARTUP", "GROWTH", "MATURE", "TURNAROUND", "DISTRESSED"])
    .optional(),
  headquarters: z.string().optional(),
  description: z.string().optional(),
  revenue: z.number().positive("Revenue must be a positive number").optional(),
  ebitda: z.number().optional(),
  growthRate: z.number().optional(),
  employees: z
    .number()
    .int()
    .positive("Employees must be a positive integer")
    .optional(),
});

export const companiesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createCompanySchema)
    .mutation(async ({ input }) => {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: input.name,
          website: input.website,
          sector: input.sector,
          stage: input.stage,
          headquarters: input.headquarters,
          description: input.description,
          revenue: input.revenue,
          ebitda: input.ebitda,
          growthRate: input.growthRate,
          employees: input.employees,
        })
        .returning();

      revalidatePath("/companies");
      revalidatePath("/due-diligence");

      return { company: newCompany };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await DeleteCompanyById(input.id);

      revalidatePath("/companies");
      revalidatePath("/due-diligence");

      return { success: true };
    }),
});
