import { z } from "zod";

/** External API (JSON body) — numeric financial fields. */
export const dealQuickAddApiSchema = z.object({
  dealTeaser: z.string().min(1, "Deal title is required"),
  companyName: z.string().optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.number().optional(),
  ebitda: z.number().optional(),
  ebitdaMargin: z.number().optional(),
  askingPrice: z.number().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.string().email().optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

export type DealQuickAddApiInput = z.infer<typeof dealQuickAddApiSchema>;
