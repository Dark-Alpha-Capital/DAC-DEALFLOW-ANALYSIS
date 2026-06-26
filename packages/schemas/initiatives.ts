import { z } from "zod";
import { INITIATIVE_STATUS_VALUES } from "@repo/enums";

export const initiativeStatusSchema = z.enum(INITIATIVE_STATUS_VALUES);

export const createInitiativeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(50000).default(""),
  status: initiativeStatusSchema.default("ACTIVE"),
  startDate: z.coerce.date().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Hex color required")
    .nullable()
    .optional(),
});

export const updateInitiativeSchema = z.object({
  initiativeId: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(50000).optional(),
  status: initiativeStatusSchema.optional(),
  startDate: z.coerce.date().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

export const linkInitiativeTrackerSchema = z.object({
  initiativeId: z.string().min(1),
  trackerId: z.string().min(1),
});

export type CreateInitiativeInput = z.infer<typeof createInitiativeSchema>;
export type UpdateInitiativeInput = z.infer<typeof updateInitiativeSchema>;
export type LinkInitiativeTrackerInput = z.infer<
  typeof linkInitiativeTrackerSchema
>;
