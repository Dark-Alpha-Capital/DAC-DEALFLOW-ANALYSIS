import { z } from "zod";
import { WORK_ITEM_STATUS_VALUES } from "@repo/enums";

export const workItemStatusSchema = z.enum(WORK_ITEM_STATUS_VALUES);

export const workItemTagsSchema = z.array(z.string().trim().min(1).max(64)).max(32);

export const estimatePointsSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .nullable()
  .optional();

export const estimateHoursSchema = z
  .number()
  .positive()
  .max(10000)
  .nullable()
  .optional();

export const createWorkItemSchema = z.object({
  trackerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(50000).default(""),
  status: workItemStatusSchema.default("TODO"),
  epicId: z.string().nullable().optional(),
  cycleId: z.string().nullable().optional(),
  moduleId: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatePoints: estimatePointsSchema,
  estimateHours: estimateHoursSchema,
  tags: workItemTagsSchema.default([]),
});

export const updateWorkItemSchema = z.object({
  workItemId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(50000).optional(),
  status: workItemStatusSchema.optional(),
  epicId: z.string().nullable().optional(),
  cycleId: z.string().nullable().optional(),
  moduleId: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatePoints: estimatePointsSchema,
  estimateHours: estimateHoursSchema,
  tags: workItemTagsSchema.optional(),
});

export type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>;
export type UpdateWorkItemInput = z.infer<typeof updateWorkItemSchema>;
