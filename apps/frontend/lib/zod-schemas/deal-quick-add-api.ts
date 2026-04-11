import { z } from "zod";

/** External API (JSON body) — numeric financial fields. */
export const dealQuickAddApiSchema = z
  .object({
  title: z.string().optional(),
  /** @deprecated Prefer `title` for the listing headline; kept for older clients. */
  dealTeaser: z.string().optional(),
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
})
  .refine(
    (v) => Boolean(v.title?.trim() || v.dealTeaser?.trim()),
    { message: "Provide title or dealTeaser", path: ["title"] },
  );

export type DealQuickAddApiInput = z.infer<typeof dealQuickAddApiSchema>;
