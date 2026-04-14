import { z } from "zod";

/** Client form: coerce numbers for inputs; differs slightly from tRPC `bitrixSyncDealOpportunitySchema`. */
export const bitrixSyncFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  stageId: z.string().min(1, "Stage is required"),
  opportunity: z.coerce.number(),
  currencyId: z.string().min(1).default("USD"),
  comments: z.string().optional(),
  sourceWebsite: z.string().optional(),
  companyLocation: z.string().optional(),
  industry: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.string().optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
  askingPrice: z.coerce.number().optional().nullable(),
  ebitda: z.coerce.number().optional().nullable(),
  ebitdaMargin: z.coerce.number().optional().nullable(),
  teaser: z.string().optional().nullable(),
  revenue: z.coerce.number().optional().nullable(),
});

export type BitrixSyncFormValues = z.infer<typeof bitrixSyncFormSchema>;
