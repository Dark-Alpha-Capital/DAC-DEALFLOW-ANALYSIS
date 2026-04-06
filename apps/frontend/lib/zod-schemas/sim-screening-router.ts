import { z } from "zod";

export const startSimScreeningInputSchema = z.object({
  documentId: z.string().min(1),
  screenerId: z.string().min(1),
});

export const simSessionRouteInputSchema = z.object({
  sessionId: z.string().min(1),
  runId: z.string().min(1).optional(),
});

export const startSimScreeningRunInputSchema = z.object({
  sessionId: z.string().min(1),
  screenerId: z.string().min(1),
});

export const retrySimScreeningRunInputSchema = z.object({
  runId: z.string().min(1),
});

export const listSimScreeningSessionsInputSchema = z
  .object({
    limit: z.number().min(1).max(100).optional(),
  })
  .optional();
