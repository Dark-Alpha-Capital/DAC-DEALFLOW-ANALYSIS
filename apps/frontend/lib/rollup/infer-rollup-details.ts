import { generateObject } from "ai";
import { google } from "@/lib/ai/available-models";
import { z } from "zod";

const InferredAttributesSchema = z.object({
  business_strategy: z.enum([
    "Market Power",
    "Economies of Scale",
    "Operational Strategies",
    "Potential Growth",
  ]),
  growth_stage: z.enum(["Startup", "Growth", "Mature", "Decline"]),
  confidence_scores: z.object({
    business_strategy: z.number().min(0).max(1),
    growth_stage: z.number().min(0).max(1),
  }),
});

async function inferAttributes(deal: any) {
  const prompt = `
Given the following company data, infer the business strategy and growth stage. Provide a confidence score (0-1) for each.

Company: ${deal.title}
Industry: ${deal.industry}
Location: ${deal.companyLocation}
Description: ${deal.dealCaption}
Revenue: ${deal.revenue}
EBITDA: ${deal.ebitda}
EBITDA Margin: ${deal.ebitdaMargin}
`;

  // const result = await generateObject({
  //   model: google("gemini-2.5-flash"),
  //   schema: InferredAttributesSchema,
  //   prompt,
  //   temperature: 0.3,
  // });

  // return result.object;
}

export { inferAttributes };
