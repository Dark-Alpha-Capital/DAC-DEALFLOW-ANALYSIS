import { z } from "zod";

const optionalCompanyIdField = z
  .string()
  .optional()
  .transform((s) => {
    if (s === "__none__" || s === undefined) return undefined;
    const t = s?.trim();
    return t ? t : undefined;
  });

export const NewDealFormSchema = z.object({
  first_name: z.optional(z.string()),
  last_name: z.optional(z.string()),
  email: z.optional(z.string().email("Invalid email address")),
  linkedinurl: z.optional(z.string().url("Invalid URL")),
  deal_caption: z
    .string()
    .min(5, { message: "Deal caption should be at least 5 characters long" }),
  title: z
    .string()
    .min(5, { message: "Title should be at least 5 characters long" }),
  work_phone: z.optional(z.string()),
  revenue: z.coerce.number().positive("Revenue must be a positive number"),
  ebitda: z.coerce.number(),
  ebitda_margin: z.coerce.number(),
  gross_revenue: z.coerce
    .number()
    .positive("Gross revenue must be a positive number"),
  company_location: z.optional(z.string()),
  brokerage: z.string().min(1, "Brokerage is required"),
  source_website: z.optional(z.string().url("Invalid URL")),
  industry: z.string().min(1, "Industry is required"),
  asking_price: z.optional(
    z.coerce.number().positive("Asking price must be a positive number"),
  ),
});

export const AddDealFormSchema = z.object({
  companyId: optionalCompanyIdField,
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  title: z.string().optional(),
  dealTeaser: z.string().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

export const EditDealFormSchema = z.object({
  companyId: optionalCompanyIdField,
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  title: z.string().optional(),
  dealTeaser: z.string().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

export type NewDealFormSchemaType = z.infer<typeof NewDealFormSchema>;
export type AddDealFormSchemaType = z.infer<typeof AddDealFormSchema>;
export type EditDealFormSchemaType = z.infer<typeof EditDealFormSchema>;
