import { z } from "zod";
import { CYCLE_STATUS_VALUES } from "@repo/enums";

export const cycleStatusSchema = z.enum(CYCLE_STATUS_VALUES);

export const createCycleSchema = z.object({
  trackerId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(50000).default(""),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  sortOrder: z.number().int().default(0),
});

export const updateCycleSchema = z.object({
  cycleId: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(50000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: cycleStatusSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const completeCycleSchema = z.object({
  cycleId: z.string().min(1),
  targetCycleId: z.string().nullable().optional(),
});

export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;
export type CompleteCycleInput = z.infer<typeof completeCycleSchema>;
