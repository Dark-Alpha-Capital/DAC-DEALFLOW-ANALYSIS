import { z } from "zod";
import { COVERAGE_STATUSES } from "./shared-form-enums";

/** Comma-formatted numeric strings; empty → valid. */
export const optionalFormattedNumberString = z
  .string()
  .optional()
  .refine(
    (v) => {
      if (v === undefined || v === "") return true;
      const s = String(v).replace(/,/g, "").trim();
      if (s === "") return true;
      return Number.isFinite(Number(s));
    },
    { message: "Invalid number" },
  );

export const QuickAddDealFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  revenueEstimate: optionalFormattedNumberString,
  ebitdaEstimate: optionalFormattedNumberString,
  ebitdaMarginEstimate: optionalFormattedNumberString,
  recurringRevenuePct: optionalFormattedNumberString,
  customerConcentrationPct: optionalFormattedNumberString,
  founderAgeEstimate: optionalFormattedNumberString,
  themeId: z.string().optional(),
  attractivenessScore: optionalFormattedNumberString,
  coverageStatus: z.enum(COVERAGE_STATUSES).optional(),
  businessModel: z.string().optional(),
  employees: optionalFormattedNumberString,
  revenueTtm: optionalFormattedNumberString,
  ebitdaTtm: optionalFormattedNumberString,
  grossMargin: optionalFormattedNumberString,
  revenueCagr: optionalFormattedNumberString,
  totalClients: optionalFormattedNumberString,
  top10Concentration: optionalFormattedNumberString,
  customerIndustries: z.array(z.string()),
  revenueModelType: z.string().optional(),
  expansionModel: z.string().optional(),
  concentrationHigh: z.boolean().optional(),
  marginLow: z.boolean().optional(),
  vendorDependency: z.boolean().optional(),
  growthLevers: z.array(z.string()),
  dealTeaser: z.string().min(1, "Deal title is required"),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.string().optional(),
  ebitda: z.string().optional(),
  ebitdaMargin: z.string().optional(),
  askingPrice: z.string().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z
    .union([z.literal(""), z.string().email("Invalid email")])
    .optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

export type QuickAddDealFormValues = z.infer<typeof QuickAddDealFormSchema>;
