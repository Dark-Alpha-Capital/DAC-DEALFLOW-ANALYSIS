import { z } from "zod";

export const startCimScreeningInputSchema = z.object({
  documentId: z.string().min(1),
  screenerId: z.string().min(1),
});

export const cimSessionRouteInputSchema = z.object({
  sessionId: z.string().min(1),
  runId: z.string().min(1).optional(),
});

export const startCimScreeningRunInputSchema = z.object({
  sessionId: z.string().min(1),
  screenerId: z.string().min(1),
});

export const retryCimScreeningRunInputSchema = z.object({
  runId: z.string().min(1),
});

export const listCimScreeningSessionsInputSchema = z
  .object({
    limit: z.number().min(1).max(100).optional(),
  })
  .optional();
