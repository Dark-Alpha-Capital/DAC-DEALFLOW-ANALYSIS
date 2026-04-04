import { z } from "zod";
import { COVERAGE_STATUSES, THEME_STATUSES } from "./shared-form-enums";

export const createThemeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  sector: z.string().min(1, "Sector is required"),
  status: z.enum(THEME_STATUSES).optional(),
  capitalPriorityScore: z.coerce.number().min(0).max(100).optional(),
  confidenceScore: z.coerce.number().optional(),
});

export const updateThemeSchema = createThemeSchema.extend({
  id: z.string().min(1, "Theme ID is required"),
});

export const thesisSchema = z.object({
  themeId: z.string().min(1, "Theme ID is required"),
  summary: z.string().min(1, "Summary is required"),
  macroDrivers: z.array(z.string().min(1)).optional().default([]),
  mispricingHypothesis: z.string().optional(),
  valueCreationLevers: z.array(z.string().min(1)).optional().default([]),
  exitLogic: z.string().optional(),
  riskFactors: z.array(z.string().min(1)).optional().default([]),
  version: z.string().min(1, "Version is required"),
});

export const industryIntelligenceSchema = z.object({
  themeId: z.string().min(1, "Theme ID is required"),
  version: z.string().min(1, "Version is required"),
  tam: z.coerce.number().optional(),
  growthRate: z.coerce.number().optional(),
  avgEbitdaMargin: z.coerce.number().optional(),
  avgEntryMultiple: z.coerce.number().optional(),
  avgExitMultiple: z.coerce.number().optional(),
  fragmentationScore: z.coerce.number().int().optional(),
  sponsorPenetration: z.coerce.number().optional(),
  cyclicalityScore: z.coerce.number().int().optional(),
  disruptionRiskScore: z.coerce.number().int().optional(),
  notes: z.string().optional(),
});

export const performanceSnapshotSchema = z.object({
  themeId: z.string().min(1, "Theme ID is required"),
  observedAt: z.string().optional(),
  dealsSourced: z.coerce.number().int().optional(),
  meetingsHeld: z.coerce.number().int().optional(),
  loisIssued: z.coerce.number().int().optional(),
  dealsClosed: z.coerce.number().int().optional(),
  averageEntryMultiple: z.coerce.number().optional(),
  averageIRR: z.coerce.number().optional(),
});

export const coverageUpsertSchema = z.object({
  themeId: z.string().min(1, "Theme ID is required"),
  companyId: z.string().min(1, "Company ID is required"),
  coverageStatus: z.enum(COVERAGE_STATUSES),
  lastOutreachAt: z.string().optional(),
  notes: z.string().optional(),
});

export const themeByIdInputSchema = z.object({ id: z.string() });

export const themeIdMinInputSchema = z.object({
  themeId: z.string().min(1),
});

export const thesisByIdAndThemeInputSchema = z.object({
  id: z.string().min(1),
  themeId: z.string().min(1),
});
