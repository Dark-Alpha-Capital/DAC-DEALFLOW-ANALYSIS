import { z } from "zod";
import { httpHttpsUrlSchema } from "./forms-common";

export const contactEntityTypeEnum = z.enum(["LEAD", "COMPANY", "DEAL_OPPORTUNITY"]);

export const baseContactSchema = z.object({
  entityType: contactEntityTypeEnum,
  entityId: z.string(),
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  linkedinUrl: httpHttpsUrlSchema.optional(),
  role: z.string().optional(),
});

export const listContactsByEntityInputSchema = z.object({
  entityType: contactEntityTypeEnum,
  entityId: z.string(),
});

export const contactByIdInputSchema = z.object({ id: z.string() });

export const updateContactSchema = baseContactSchema.extend({
  id: z.string(),
});
