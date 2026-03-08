import * as z from "zod";
import { DealDocumentCategory, DealStatus } from "@repo/db/schema";

const optionalNumberFromInputSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().optional(),
);

export const httpHttpsUrlSchema = z
  .string()
  .url("Invalid URL")
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "URL must start with http:// or https://");

export function parseOptionalNumericInput(
  value: string,
): number | undefined | null {
  const rawValue = value.replace(/,/g, "");

  if (!/^\d*\.?\d*$/.test(rawValue)) {
    return null;
  }

  if (rawValue === "") {
    return undefined;
  }

  const parsed = Number.parseFloat(rawValue);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export const dealSpecificationsFormSchema = z.object({
  isReviewed: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  seen: z.boolean().default(false),
  status: z.nativeEnum(DealStatus),
});

export type dealSpecificationsFormSchemaType = z.infer<
  typeof dealSpecificationsFormSchema
>;

export const dealDocumentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(DealDocumentCategory),
  tags: z.array(z.string()).optional().default([]),
  file: z.instanceof(File).refine((file) => file.size <= 20 * 1024 * 1024, {
    message: "File size must be less than 20MB",
  }),
});

export type DealDocumentFormValues = z.infer<typeof dealDocumentFormSchema>;

export const screenDealSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
});

export type screenDealSchemaType = z.infer<typeof screenDealSchema>;

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Invalid email")]).optional(),
  phone: z.string().optional(),
  linkedinUrl: z.union([z.literal(""), httpHttpsUrlSchema]).optional(),
  role: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const convertLeadToCompanyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  normalizedName: z.string().min(1, "Normalized name is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  revenueEstimate: optionalNumberFromInputSchema,
  ebitdaEstimate: optionalNumberFromInputSchema,
});

export type ConvertLeadToCompanyFormValues = z.infer<
  typeof convertLeadToCompanyFormSchema
>;

export const convertLeadToCompanySchema = convertLeadToCompanyFormSchema.extend({
  id: z.string(),
});

export type ConvertLeadToCompanyInput = z.infer<
  typeof convertLeadToCompanySchema
>;

export const leadFormSchema = z.object({
  sourceWebsite: z.string().min(1, "Source website is required"),
  externalListingId: z.string().optional(),
  rawTitle: z.string().min(1, "Title is required"),
  rawDescription: z.string().optional(),
  rawIndustry: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  brokerage: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z
    .union([z.string().email("Invalid email"), z.literal("")])
    .optional(),
  brokerPhone: z.string().optional(),
  normalizedCompanyName: z.string().optional(),
  companyLocation: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
