import { DealStatus, DealType } from "@repo/db/enums";
import { z } from "zod";

/** Route / entity id passed from loaders (cuid2-style or similar). */
export const uidSchema = z.string().min(1);

export const uidParamSchema = z.object({
  uid: uidSchema,
});

export const offsetLimitSchema = z.object({
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive().max(500),
});

export const dealOpportunityIdSchema = z.object({
  dealOpportunityId: uidSchema,
});

export const uidAndReasoningIdSchema = z.object({
  uid: uidSchema,
  reasoningId: uidSchema,
});

/** Chat session loader: server binds `userId` from the session (no client-supplied userId). */
export const chatLoaderInputSchema = z.object({
  chatId: uidSchema,
});

export const cimScreeningSessionInputSchema = z.object({
  sessionId: uidSchema,
  runId: uidSchema.optional(),
});

export const cimScreeningSessionSyncInputSchema = z.object({
  sessionId: uidSchema,
  runId: uidSchema.optional(),
});

export const rawDealsListFilterSchema = z.object({
  search: z.string(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive().max(500),
  dealTypes: z.array(z.nativeEnum(DealType)),
  ebitda: z.string(),
  userId: z.string(),
  revenue: z.string(),
  location: z.string(),
  maxRevenue: z.string(),
  maxEbitda: z.string(),
  brokerage: z.string(),
  industry: z.string(),
  ebitdaMargin: z.string(),
  showSeen: z.boolean(),
  showRecent: z.boolean(),
  showReviewed: z.boolean(),
  showPublished: z.boolean(),
  status: z.nativeEnum(DealStatus),
  tags: z.array(z.string()),
});

export const investmentThemesListFilterSchema = z.object({
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive().max(500),
  search: z.string(),
  sector: z.string(),
  status: z.enum(["ACTIVE", "PAUSED", "RETIRED"]).optional(),
  minCapitalPriorityScore: z.number().optional(),
  maxCapitalPriorityScore: z.number().optional(),
  minConfidenceScore: z.number().optional(),
  maxConfidenceScore: z.number().optional(),
});

/** Payload for Bitrix export — matches `LegacyRawDealBitrixInput` in @repo/bitrix-sync. */
export const exportDealToBitrixInputSchema = z.object({
  id: uidSchema,
  dealCaption: z.string(),
  revenue: z.coerce.number(),
  sourceWebsite: z.string(),
  companyLocation: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  workPhone: z.string().nullable().optional(),
  industry: z.string(),
  ebitda: z.coerce.number(),
  ebitdaMargin: z.coerce.number(),
  askingPrice: z.coerce.number().nullable().optional(),
});

export const transformedDealSchema = z.object({
  brokerage: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  linkedinUrl: z.string().optional(),
  email: z.string().optional(),
  workPhone: z.string().optional(),
  dealCaption: z.string(),
  revenue: z.number(),
  ebitda: z.number(),
  ebitdaMargin: z.number(),
  industry: z.string(),
  sourceWebsite: z.string(),
  companyLocation: z.string().optional(),
});

export const bulkUploadDealsInputSchema = z
  .array(transformedDealSchema)
  .min(1)
  .max(500);
