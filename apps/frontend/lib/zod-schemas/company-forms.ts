import { z } from "zod";
import { COVERAGE_STATUSES, GROWTH_LEVER_OPTIONS } from "./shared-form-enums";

export const AddCompanyFormSchema = z.object({
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
});

export const EditCompanyFormSchema = z.object({
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
  customerIndustries: z.string().optional(),
  revenueModelType: z.string().optional(),
  expansionModel: z.string().optional(),
  concentrationHigh: z.boolean().optional(),
  marginLow: z.boolean().optional(),
  vendorDependency: z.boolean().optional(),
  growthLevers: z.array(z.string()).optional(),
});

export type AddCompanyFormSchemaType = z.infer<typeof AddCompanyFormSchema>;
export type EditCompanyFormSchemaType = z.infer<typeof EditCompanyFormSchema>;

export { GROWTH_LEVER_OPTIONS };
