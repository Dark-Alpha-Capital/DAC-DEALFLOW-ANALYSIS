import { z } from "zod";

export const viewTypeSchema = z.enum(["list", "board", "timeline", "calendar"] as const);

export const createViewSchema = z.object({
  trackerId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  type: viewTypeSchema,
  filters: z.record(z.string(), z.unknown()).default({}),
  sortConfig: z.record(z.string(), z.unknown()).default({}),
  groupBy: z.string().nullable().optional(),
  displayProps: z.record(z.string(), z.unknown()).default({}),
  isDefault: z.boolean().default(false),
});

export const updateViewSchema = z.object({
  viewId: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  type: viewTypeSchema.optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sortConfig: z.record(z.string(), z.unknown()).optional(),
  groupBy: z.string().nullable().optional(),
  displayProps: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export type CreateViewInput = z.infer<typeof createViewSchema>;
export type UpdateViewInput = z.infer<typeof updateViewSchema>;
