import { z } from "zod";
import { THEME_STATUSES } from "./shared-form-enums";

export const ThemeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  sector: z.string().min(1, "Sector is required"),
  status: z.enum(THEME_STATUSES).optional(),
  capitalPriorityScore: z.coerce.number().min(0).max(100).optional(),
  confidenceScore: z.coerce.number().optional(),
});

export type ThemeFormSchemaType = z.infer<typeof ThemeFormSchema>;
