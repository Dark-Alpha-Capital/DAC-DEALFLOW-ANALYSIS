import * as z from "zod";
import { DealDocumentCategory, DealStatus } from "@prisma/client";

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
  file: z.instanceof(File).refine((file) => file.size <= 20 * 1024 * 1024, {
    message: "File size must be less than 20MB",
  }),
});

export type DealDocumentFormValues = z.infer<typeof dealDocumentFormSchema>;

export const cimFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  caption: z.string().min(1, "Caption is required"),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
  file: z.instanceof(File).refine((file) => file.size <= 10 * 1024 * 1024, {
    message: "File size must be less than 10MB",
  }),
});

export type CimFormValues = z.infer<typeof cimFormSchema>;

export const screenDealSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
});

export type screenDealSchemaType = z.infer<typeof screenDealSchema>;
