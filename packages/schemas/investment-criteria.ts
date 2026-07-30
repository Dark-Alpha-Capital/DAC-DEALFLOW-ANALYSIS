import { z } from "zod";

export const preferredIndustrySchema = z.object({
  label: z.string().trim().min(1, "Industry label is required"),
  aliases: z.array(z.string().trim().min(1)).default([]),
});

export const revenueScoreBandSchema = z
  .object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    score: z.number().int().min(0).max(100),
  })
  .refine(
    (value) => value.min != null || value.max != null,
    "Revenue bands need a min, max, or both",
  );

export const investmentCriteriaProfileSchema = z.object({
  key: z.string().trim().min(1).default("default"),
  version: z.string().trim().min(1).default("1"),
  firmName: z.string().trim().min(1, "Firm name is required"),
  ebitdaMin: z.number().nonnegative(),
  ebitdaMax: z.number().positive(),
  revenueMin: z.number().nonnegative().nullable(),
  revenueMax: z.number().positive().nullable(),
  ebitdaMarginMin: z.number().min(0).max(1).nullable(),
  preferredIndustries: z
    .array(preferredIndustrySchema)
    .min(1, "Add at least one preferred industry"),
  excludedIndustries: z.array(z.string().trim().min(1)).default([]),
  geographies: z.array(z.string().trim().min(1)).default([]),
  ownershipNotes: z.string().trim().nullable(),
  customerConcentrationIdealMax: z.number().min(0).max(100).nullable(),
  customerConcentrationWarnAbove: z.number().min(0).max(100).nullable(),
  positiveScreensMd: z.string().trim().nullable(),
  negativeScreensMd: z.string().trim().nullable(),
  weightEbitdaFit: z.number().min(0).max(1),
  weightRevenue: z.number().min(0).max(1),
  weightIndustry: z.number().min(0).max(1),
  revenueScoreWhenMissing: z.number().int().min(0).max(100).default(50),
  revenueScoreBands: z.array(revenueScoreBandSchema).min(1),
  criteriaNarrativeMd: z.string().trim().min(1, "Criteria narrative is required"),
  icRubricMd: z.string().trim().nullable(),
});

export const updateInvestmentCriteriaProfileSchema =
  investmentCriteriaProfileSchema.superRefine((value, ctx) => {
    if (value.ebitdaMax <= value.ebitdaMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ebitdaMax"],
        message: "EBITDA max must be greater than EBITDA min",
      });
    }

    if (
      value.revenueMin != null &&
      value.revenueMax != null &&
      value.revenueMax <= value.revenueMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["revenueMax"],
        message: "Revenue max must be greater than revenue min",
      });
    }

    const totalWeight =
      value.weightEbitdaFit + value.weightRevenue + value.weightIndustry;
    if (Math.abs(totalWeight - 1) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weightIndustry"],
        message: "Screening weights must add up to 1.0",
      });
    }
  });

export type PreferredIndustryInput = z.infer<typeof preferredIndustrySchema>;
export type RevenueScoreBandInput = z.infer<typeof revenueScoreBandSchema>;
export type InvestmentCriteriaProfileInput = z.infer<
  typeof investmentCriteriaProfileSchema
>;
