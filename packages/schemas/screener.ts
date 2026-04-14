import { z } from "zod";

export const screenerTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});

export const screenerQuestionFieldsSchema = z.object({
  question: z.string().min(1, "Question is required"),
  weight: z.coerce.number().int().min(0).max(100),
});

export type ScreenerTemplateFormValues = z.infer<typeof screenerTemplateSchema>;
export type ScreenerQuestionFieldsValues = z.infer<
  typeof screenerQuestionFieldsSchema
>;
