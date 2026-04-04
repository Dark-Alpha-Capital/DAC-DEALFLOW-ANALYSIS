import { z } from "zod";
import {
  INVESTOR_LEAD_STATUSES,
  INVESTOR_STATUSES,
  INVESTOR_TYPES,
  RISK_PROFILES,
} from "./shared-form-enums";

export const AddInvestorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(INVESTOR_TYPES),
  primaryContactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  geography: z.string().optional(),
  minCheckSize: z.string().optional(),
  maxCheckSize: z.string().optional(),
  sectorFocus: z.string().optional(),
  stagePreference: z.string().optional(),
  riskProfile: z.enum(RISK_PROFILES).optional(),
  status: z.enum(INVESTOR_STATUSES).optional(),
});

export const EditInvestorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(INVESTOR_TYPES),
  primaryContactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  geography: z.string().optional(),
  minCheckSize: z.string().optional(),
  maxCheckSize: z.string().optional(),
  sectorFocus: z.string().optional(),
  stagePreference: z.string().optional(),
  riskProfile: z.enum(RISK_PROFILES).optional(),
  status: z.enum(INVESTOR_STATUSES).optional(),
});

export const AddInvestorLeadFormSchema = z.object({
  name: z.string().optional(),
  source: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  inferredType: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(INVESTOR_LEAD_STATUSES).optional(),
});

export const EditInvestorLeadFormSchema = z.object({
  name: z.string().optional(),
  source: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  inferredType: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(INVESTOR_LEAD_STATUSES).optional(),
});

export type AddInvestorFormSchemaType = z.infer<typeof AddInvestorFormSchema>;
export type EditInvestorFormSchemaType = z.infer<typeof EditInvestorFormSchema>;
export type AddInvestorLeadFormSchemaType = z.infer<typeof AddInvestorLeadFormSchema>;
export type EditInvestorLeadFormSchemaType = z.infer<
  typeof EditInvestorLeadFormSchema
>;
