import { z } from "zod";
import {
  DealType,
  DealStatus,
  ReviewState,
  DealDocumentCategory,
  DocumentCategory,
  DealFinancialSnapshotSource,
  DealRiskType,
  DealRiskSeverity,
} from "@repo/db";
import { COVERAGE_STATUSES } from "./shared-form-enums";

export const createDealSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  linkedinurl: z.string().url("Invalid URL").optional(),
  deal_caption: z
    .string()
    .min(5, { message: "Deal caption should be at least 5 characters long" }),
  title: z
    .string()
    .min(5, { message: "Title should be at least 5 characters long" }),
  work_phone: z.string().optional(),
  revenue: z.number().positive("Revenue must be a positive number"),
  ebitda: z.number(),
  ebitda_margin: z.number(),
  gross_revenue: z.number().positive("Gross revenue must be a positive number"),
  company_location: z.string().optional(),
  brokerage: z.string().min(1, "Brokerage is required"),
  source_website: z.string().url("Invalid URL").optional(),
  industry: z.string().min(1, "Industry is required"),
  asking_price: z
    .number()
    .positive("Asking price must be a positive number")
    .optional(),
});

export const updateDealSchema = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  linkedinurl: z.string().optional(),
  deal_caption: z
    .string()
    .min(5, { message: "Deal caption should be at least 5 characters long" }),
  title: z
    .string()
    .min(5, { message: "Title should be at least 5 characters long" }),
  work_phone: z.string().optional(),
  revenue: z.number().optional(),
  ebitda: z.number().optional(),
  ebitda_margin: z.number().optional(),
  gross_revenue: z.number().optional(),
  company_location: z.string().optional(),
  brokerage: z.string().optional(),
  source_website: z.string().optional(),
  inventory: z.number().optional(),
  industry: z.string().optional(),
  asking_price: z.number().optional(),
});

export const updateTagsSchema = z.object({
  dealId: z.string(),
  tags: z.array(z.string()).min(1, "At least one tag is required"),
});

export const updateSpecificationsSchema = z.object({
  dealId: z.string(),
  reviewState: z.enum(["NOT_SEEN", "SEEN", "REVIEWED", "PUBLISHED"] as const),
  status: z.nativeEnum(DealStatus),
});

export const createDealOpportunitySchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  leadId: z.string().optional(),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  dealTeaser: z.string().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

export const createOpportunityQuickCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  revenueEstimate: z.coerce.number().optional(),
  ebitdaEstimate: z.coerce.number().optional(),
  ebitdaMarginEstimate: z.coerce.number().optional(),
  recurringRevenuePct: z.coerce.number().optional(),
  customerConcentrationPct: z.coerce.number().optional(),
  founderAgeEstimate: z.coerce.number().optional(),
  themeId: z.string().optional(),
  attractivenessScore: z.coerce.number().optional(),
  coverageStatus: z.enum(COVERAGE_STATUSES).optional(),
  businessModel: z.string().optional(),
  employees: z.coerce.number().optional(),
  revenueTtm: z.coerce.number().optional(),
  ebitdaTtm: z.coerce.number().optional(),
  grossMargin: z.coerce.number().optional(),
  revenueCagr: z.coerce.number().optional(),
  totalClients: z.coerce.number().optional(),
  top10Concentration: z.coerce.number().optional(),
  customerIndustries: z.array(z.string()).optional(),
  revenueModelType: z.string().optional(),
  expansionModel: z.string().optional(),
  concentrationHigh: z.boolean().optional(),
  marginLow: z.boolean().optional(),
  vendorDependency: z.boolean().optional(),
  growthLevers: z.array(z.string()).optional(),
});

export const createOpportunityQuickSchema = createOpportunityQuickCompanySchema.extend({
  dealTeaser: z.string().min(1, "Deal title is required"),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

export const addFinancialSnapshotSchema = z.object({
  dealOpportunityId: z.string().min(1),
  revenue: z.number().nullable().optional(),
  ebitda: z.number().nullable().optional(),
  ebitdaMargin: z.number().nullable().optional(),
  askingPrice: z.number().nullable().optional(),
  impliedMultiple: z.number().nullable().optional(),
  source: z.nativeEnum(DealFinancialSnapshotSource).default("MANUAL"),
  notes: z.string().optional(),
});

export const addRiskFlagSchema = z.object({
  dealOpportunityId: z.string().min(1),
  riskType: z.nativeEnum(DealRiskType),
  severity: z.nativeEnum(DealRiskSeverity),
  description: z.string().min(1),
});

export const updateOpportunityStageSchema = z.object({
  id: z.string(),
  stage: z.enum([
    "LISTED",
    "INITIAL_REVIEW",
    "SCREENED",
    "MEETING_HELD",
    "IOI_SUBMITTED",
    "LOI_SUBMITTED",
    "DILIGENCE",
    "CLOSED",
    "DEAD",
  ]),
});

export const screenOpportunitySchema = z.object({
  id: z.string(),
});

export const uploadDealDocumentSchema = z.object({
  dealId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(DealDocumentCategory),
  tags: z.array(z.string()).optional().default([]),
  fileData: z.string(),
  fileName: z.string(),
  fileType: z.string(),
});

export const uploadCIMSchema = z.object({
  dealOpportunityId: z.string().min(1, "Deal opportunity ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.nativeEnum(DocumentCategory),
  fileData: z.string(),
  fileName: z.string().min(1, "File name is required"),
});

export const editFinancialsSchema = z.object({
  dealOpportunityId: z.string().min(1),
  revenueHistory: z.record(z.string(), z.number()).optional().nullable(),
  ebitdaHistory: z.record(z.string(), z.number()).optional().nullable(),
  employeeCount: z.number().optional().nullable(),
  customerConcentration: z.number().optional().nullable(),
  capexIntensity: z.string().optional().nullable(),
  revenueBreakdown: z.record(z.string(), z.number()).optional().nullable(),
  growthDrivers: z.array(z.string()).optional().nullable(),
  keyRisks: z.array(z.string()).optional().nullable(),
  industryOverview: z.string().optional().nullable(),
  transactionDetails: z.string().optional().nullable(),
});

export const bitrixSyncDealOpportunitySchema = z.object({
  dealOpportunityId: z.string().min(1),
  title: z.string().min(1),
  stageId: z.string().min(1),
  opportunity: z.number(),
  currencyId: z.string().min(1).default("USD"),
  comments: z.string().optional(),
  sourceWebsite: z.string().optional().nullable(),
  companyLocation: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  brokerFirstName: z.string().optional().nullable(),
  brokerLastName: z.string().optional().nullable(),
  brokerEmail: z.string().optional().nullable(),
  brokerPhone: z.string().optional().nullable(),
  brokerLinkedIn: z.string().optional().nullable(),
  askingPrice: z.number().nullable().optional(),
  ebitda: z.number().nullable().optional(),
  ebitdaMargin: z.number().nullable().optional(),
});

export const searchForChatInputSchema = z
  .object({
    query: z.string().trim().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional();

export const dealOpportunityIdInputSchema = z.object({
  dealOpportunityId: z.string(),
});

export const dealOpportunityIdMinInputSchema = z.object({
  dealOpportunityId: z.string().min(1),
});

export const startTemplateScreeningInputSchema = z.object({
  dealOpportunityId: z.string().min(1),
  screenerId: z.string().min(1),
});

export const deleteOpportunityInputSchema = z.object({ id: z.string() });

export const adminDeleteDealInputSchema = z.object({
  id: z.string(),
  dealType: z.nativeEnum(DealType),
});

export const bulkDeleteDealsInputSchema = z.object({
  dealIds: z.array(z.string()).min(1),
});
