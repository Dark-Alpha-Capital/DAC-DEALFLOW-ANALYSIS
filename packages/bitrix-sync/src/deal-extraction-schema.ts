import { z } from "zod";

/**
 * OpenAI structured-output mode requires `required` to list every property.
 * Do not use `.optional()` on object fields — use `.nullable()` so keys are always
 * present and unknown values are JSON `null`.
 */
export const bitrixDealOpportunityExtractionSchema = z.object({
  title: z
    .string()
    .describe(
      "Concise deal name for the Bitrix deal TITLE (company or transaction name).",
    ),
  revenue: z
    .number()
    .nullable()
    .describe(
      "Company TTM or annual revenue when stated; null if unknown.",
    ),
  teaser: z
    .string()
    .describe(
      "Deal narrative for Bitrix teaser: description, thesis, risks, notes. Use an empty string if the source has no long-form narrative (users may add it later).",
    ),
  companyLocation: z
    .string()
    .nullable()
    .describe("City, region, or country; null if unknown."),
  industry: z
    .string()
    .nullable()
    .describe("Industry or sector; null if unknown."),
  brokerFirstName: z.string().nullable(),
  brokerLastName: z.string().nullable(),
  brokerEmail: z.string().nullable(),
  brokerPhone: z.string().nullable(),
  brokerLinkedIn: z.string().nullable(),
  askingPrice: z
    .number()
    .nullable()
    .describe("Asking price if stated; null if unknown."),
  ebitda: z.number().nullable(),
  ebitdaMargin: z.number().nullable(),
});

export type BitrixDealOpportunityExtraction = z.infer<
  typeof bitrixDealOpportunityExtractionSchema
>;
