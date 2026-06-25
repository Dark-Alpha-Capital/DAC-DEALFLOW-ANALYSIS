import { z } from "zod";
import { WORK_ITEM_STATUS_VALUES } from "@repo/enums";

export const workItemStatusSchema = z.enum(WORK_ITEM_STATUS_VALUES);

export const workItemTagsSchema = z.array(z.string().trim().min(1).max(64)).max(32);

export const createWorkItemSchema = z.object({
  trackerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(50000).default(""),
  status: workItemStatusSchema.default("TODO"),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  tags: workItemTagsSchema.default([]),
});

export const updateWorkItemSchema = z.object({
  workItemId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(50000).optional(),
  status: workItemStatusSchema.optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  tags: workItemTagsSchema.optional(),
});

export type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>;
export type UpdateWorkItemInput = z.infer<typeof updateWorkItemSchema>;
