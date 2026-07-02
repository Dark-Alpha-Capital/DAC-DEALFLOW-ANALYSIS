import { z } from "zod";
import { MODULE_STATUS_VALUES } from "@repo/enums";

export const moduleStatusSchema = z.enum(MODULE_STATUS_VALUES);

export const createModuleSchema = z.object({
  trackerId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(50000).default(""),
  status: moduleStatusSchema.optional(),
  leadUserId: z.string().nullable().optional(),
  memberUserIds: z.array(z.string()).optional(),
  sortOrder: z.number().int().default(0),
});

export const updateModuleSchema = z.object({
  moduleId: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(50000).optional(),
  status: moduleStatusSchema.optional(),
  leadUserId: z.string().nullable().optional(),
  memberUserIds: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
