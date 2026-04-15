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
      "Full deal narrative: complete description, thesis, risks, and notes to store as the deal teaser / long-form text in Bitrix (may be multiple paragraphs).",
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
