import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { companies } from "db";
import { DeleteCompanyById } from "db/mutations";
import { revalidatePath } from "next/cache";
import { TRPCError } from "@trpc/server";

// Helper to convert empty strings to undefined
const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === "string" && val.trim() === "") return undefined;
    return val;
  }, schema);

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: emptyStringToUndefined(z.string().url("Invalid URL").optional()),
  sector: emptyStringToUndefined(z.string().optional()),
  stage: z
    .enum(["STARTUP", "GROWTH", "MATURE", "TURNAROUND", "DISTRESSED"])
    .optional(),
  headquarters: emptyStringToUndefined(z.string().optional()),
  description: emptyStringToUndefined(z.string().optional()),
  revenue: z.number().positive("Revenue must be a positive number").optional(),
  ebitda: z.number().optional(),
  growthRate: z.number().optional(),
  employees: z
    .number()
    .int()
    .positive("Employees must be a positive integer")
    .min(1, "Employees must be at least 1"),
});

export const companiesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createCompanySchema)
    .mutation(async ({ input }) => {
      console.log("inside create company router", input);

      try {
        const [newCompany] = await db
          .insert(companies)
          .values({
            name: input.name,
            website: input.website,
            sector: input.sector,
            stage: input.stage,
            headquarters: input.headquarters,
            description: input.description,
            revenue: input.revenue?.toString(),
            ebitda: input.ebitda?.toString(),
            growthRate: input.growthRate?.toString(),
            employees: input.employees,
            updatedAt: new Date(),
          })
          .returning();

        revalidatePath("/companies");
        revalidatePath("/due-diligence");

        return { company: newCompany };
      } catch (error) {
        console.error("error creating company", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create company",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await DeleteCompanyById(input.id);

      revalidatePath("/companies");
      revalidatePath("/due-diligence");

      return { success: true };
    }),

  askDueDiligenceQuestion: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        question: z.string().min(1, "Question is required"),
      }),
    )
    .mutation(async ({ input }) => {
      // TODO: Implement the actual AI due diligence question processing
      // This should:
      // 1. Fetch company data and related documents/files
      // 2. Process the question using AI (e.g., via worker API)
      // 3. Return the answer

      // Placeholder implementation - replace with actual logic
      return {
        answer: `This is a placeholder response for the question: "${input.question}". Implement the actual AI processing logic here.`,
        sources: [],
      };
    }),
});
