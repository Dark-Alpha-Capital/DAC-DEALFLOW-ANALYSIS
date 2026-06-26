import { z } from "zod";

export const createWorkLogSchema = z.object({
  workItemId: z.string().min(1),
  hours: z.number().positive().max(168),
  description: z.string().max(5000).default(""),
  loggedAt: z.coerce.date().default(() => new Date()),
});

export const updateWorkLogSchema = z.object({
  logId: z.string().min(1),
  hours: z.number().positive().max(168).optional(),
  description: z.string().max(5000).optional(),
  loggedAt: z.coerce.date().optional(),
});

export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>;
export type UpdateWorkLogInput = z.infer<typeof updateWorkLogSchema>;
