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
  opportunity: z
    .number()
    .describe(
      "Deal value for Bitrix OPPORTUNITY (EV, purchase price, or main transaction size—not necessarily company revenue).",
    ),
  revenue: z
    .number()
    .nullable()
    .describe(
      "Company TTM or annual revenue when stated separately from deal value; null if unknown or same as deal value.",
    ),
  currencyId: z
    .string()
    .nullable()
    .describe(
      "ISO currency code for amounts, e.g. USD; null if unknown (app defaults to USD).",
    ),
  teaser: z
    .string()
    .nullable()
    .describe(
      "Very short one-line deal teaser (shown at start of Bitrix deal COMMENTS); null if none.",
    ),
  description: z
    .string()
    .nullable()
    .describe(
      "Longer deal narrative for Bitrix COMMENTS body; null if none.",
    ),
  comments: z
    .string()
    .nullable()
    .describe(
      "Additional notes after teaser/description; null if none.",
    ),
  sourceWebsite: z
    .string()
    .nullable()
    .describe(
      "Company or listing URL from the text (https://…); null only if absent—users must supply one before sync.",
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
