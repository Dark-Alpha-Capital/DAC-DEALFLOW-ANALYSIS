import { z } from "zod";
import { COVERAGE_STATUSES } from "./shared-form-enums";

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  normalizedName: z.string().min(1, "Normalized name is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  revenueEstimate: z.coerce.number().optional(),
  ebitdaEstimate: z.coerce.number().optional(),
  ebitdaMarginEstimate: z.coerce.number().optional(),
  recurringRevenuePct: z.coerce.number().optional(),
  customerConcentrationPct: z.coerce.number().optional(),
  founderAgeEstimate: z.coerce.number().optional(),
  attractivenessScore: z.coerce.number().optional(),
  coverageStatus: z.enum(COVERAGE_STATUSES).optional(),
  businessModel: z.string().optional(),
  employees: z.coerce.number().optional(),
  revenueTtm: z.coerce.number().optional(),
  ebitdaTtm: z.coerce.number().optional(),
  grossMargin: z.coerce.number().optional(),
  revenueCagr: z.coerce.number().optional(),
  totalClients: z.coerce.number().optional(),
  top10Concentration: z.coerce.number().optional(),
  customerIndustries: z.array(z.string()).optional(),
  revenueModelType: z.string().optional(),
  expansionModel: z.string().optional(),
  concentrationHigh: z.boolean().optional(),
  marginLow: z.boolean().optional(),
  vendorDependency: z.boolean().optional(),
  growthLevers: z.array(z.string()).optional(),
});

export const createCompanySchema = companySchema;

export const updateCompanySchema = companySchema.extend({
  id: z.string(),
});

export const deleteCompanyInputSchema = z.object({ id: z.string() });

export const companyFinancialSnapshotsListInputSchema = z.object({
  companyId: z.string(),
});

export const createCompanyFinancialSnapshotSchema = z.object({
  companyId: z.string(),
  periodEnd: z.coerce.date(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  grossMargin: z.coerce.number().optional(),
  revenueCagr: z.coerce.number().optional(),
  employees: z.coerce.number().optional(),
  totalClients: z.coerce.number().optional(),
  top10Concentration: z.coerce.number().optional(),
  recurringRevenuePct: z.coerce.number().optional(),
  source: z.enum(["MANAGEMENT", "CIM", "MANUAL"]),
  notes: z.string().optional(),
});

export const searchForChatCompaniesInputSchema = z
  .object({
    query: z.string().trim().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional();

export const companyByIdInputSchema = z.object({ id: z.string() });
