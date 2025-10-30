import { z } from "zod";

export const AddCompanyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.optional(z.string().url("Invalid URL")),
  sector: z.optional(z.string()),
  stage: z.optional(
    z.enum(["STARTUP", "GROWTH", "MATURE", "TURNAROUND", "DISTRESSED"]),
  ),
  headquarters: z.optional(z.string()),
  description: z.optional(z.string()),
  revenue: z.optional(
    z.coerce.number().positive("Revenue must be a positive number"),
  ),
  ebitda: z.optional(z.coerce.number()),
  growthRate: z.optional(z.coerce.number()),
  employees: z.optional(
    z.coerce.number().int().positive("Employees must be a positive integer"),
  ),
});

export type AddCompanyFormSchemaType = z.infer<typeof AddCompanyFormSchema>;
