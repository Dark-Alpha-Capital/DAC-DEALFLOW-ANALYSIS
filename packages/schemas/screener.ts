import { z } from "zod";

export const screenerTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["Deal Screener", "Project Screener"], {
    error: "Please select a screener type",
  }),
  description: z.string().optional(),
  content: z.string().optional(),
  department: z
    .enum([
      "Capital Markets",
      "Deal Team",
      "Legal and Compliance",
      "Operations",
      "M&A Origination",
      "Technology",
      "Investor Relations",
      "Public Markets/Hedge Fund",
      "Investment Team",
      "Due Diligence",
      "Talent Acquisition",
      "Operating Partner",
    ])
    .nullable()
    .optional(),
});

export const screenerQuestionFieldsSchema = z.object({
  question: z.string().min(1, "Question is required"),
  weight: z.coerce.number().int().min(0).max(100),
});

export type ScreenerTemplateFormValues = z.infer<typeof screenerTemplateSchema>;
export type ScreenerQuestionFieldsValues = z.infer<
  typeof screenerQuestionFieldsSchema
>;
