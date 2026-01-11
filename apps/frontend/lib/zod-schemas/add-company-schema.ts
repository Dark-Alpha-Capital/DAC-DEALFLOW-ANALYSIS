import { z } from "zod";

// Helper to convert empty strings to undefined before coercion
const emptyStringToUndefinedNumber = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    return val;
  }, schema);

export const AddCompanyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.optional(z.string().url("Invalid URL")),
  sector: z.optional(z.string()),
  stage: z.optional(
    z.enum(["STARTUP", "GROWTH", "MATURE", "TURNAROUND", "DISTRESSED"]),
  ),
  headquarters: z.optional(z.string()),
  description: z.optional(z.string()),
  revenue: emptyStringToUndefinedNumber(
    z.coerce.number().positive("Revenue must be a positive number").optional(),
  ),
  ebitda: emptyStringToUndefinedNumber(
    z.coerce.number().optional(),
  ),
  growthRate: emptyStringToUndefinedNumber(
    z.coerce.number().optional(),
  ),
  employees: emptyStringToUndefinedNumber(
    z.coerce
      .number()
      .int()
      .positive("Employees must be a positive integer")
      .min(1, "Employees must be at least 1"),
  ),
});

export type AddCompanyFormSchemaType = z.infer<typeof AddCompanyFormSchema>;
