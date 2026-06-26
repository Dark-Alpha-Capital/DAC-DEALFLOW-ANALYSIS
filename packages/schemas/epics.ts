import { z } from "zod";
import { EPIC_STATUS_VALUES } from "@repo/enums";

export const epicStatusSchema = z.enum(EPIC_STATUS_VALUES);

export const createEpicSchema = z.object({
  trackerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(50000).default(""),
  status: epicStatusSchema.default("ACTIVE"),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export const updateEpicSchema = z.object({
  epicId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(50000).optional(),
  status: epicStatusSchema.optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateEpicInput = z.infer<typeof createEpicSchema>;
export type UpdateEpicInput = z.infer<typeof updateEpicSchema>;
