import * as z from "zod";
import { DealDocumentCategory, DealStatus } from "@repo/db/schema";

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
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  role: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

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
