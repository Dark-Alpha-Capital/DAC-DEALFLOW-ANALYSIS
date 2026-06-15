import { z } from "zod";
import { DEPARTMENT_VALUES } from "@repo/enums";
import { SCREENER_CATEGORY_VALUES } from "@repo/db/enums";

export const screenerCategorySchema = z.enum(SCREENER_CATEGORY_VALUES);
export type ScreenerCategoryFormValue = z.infer<typeof screenerCategorySchema>;

export const screenerDepartmentSchema = z.enum(DEPARTMENT_VALUES);
export type ScreenerDepartmentFormValue = z.infer<typeof screenerDepartmentSchema>;

export const screenerTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: screenerCategorySchema,
  description: z.string().optional(),
  content: z.string().optional(),
  department: screenerDepartmentSchema.nullable().optional(),
});

export const screenerQuestionFieldsSchema = z.object({
  question: z.string().min(1, "Question is required"),
  weight: z.coerce.number().int().min(0).max(100),
});

export type ScreenerTemplateFormValues = z.infer<typeof screenerTemplateSchema>;
export type ScreenerQuestionFieldsValues = z.infer<typeof screenerQuestionFieldsSchema>;
