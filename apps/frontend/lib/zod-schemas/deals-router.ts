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

const optionalCompanyId = z
  .string()
  .optional()
  .transform((s) => {
    if (s === "__none__" || s === undefined) return undefined;
    const t = s?.trim();
    return t ? t : undefined;
  });

export const createDealOpportunitySchema = z.object({
  companyId: optionalCompanyId,
  leadId: z.string().optional(),
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

export const createOpportunityQuickSchema = z.object({
  title: z.string().min(1, "Deal title is required"),
  dealTeaser: z.string().optional(),
  themeId: z.string().optional(),
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
  /** Bitrix `STAGE_ID` for the configured deal pipeline. */
  stage: z.string().min(1),
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
  /** Bitrix OPPORTUNITY; if omitted, server uses askingPrice → revenue → 0. */
  opportunity: z.number().optional(),
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
  revenue: z.number().nullable().optional(),
  teaser: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const bitrixSyncScreeningRunToDealSchema =
  bitrixSyncDealOpportunitySchema.extend({
    sessionId: z.string().min(1),
    runId: z.string().min(1),
    screeningComment: z.string().min(1),
  });

export const bitrixWidgetContextAuthSchema = z.object({
  dealId: z.string().min(1),
  memberId: z.string().optional(),
  expiresAt: z.coerce.number().int().positive().optional(),
  authSig: z.string().optional(),
  authId: z.string().optional(),
  appSid: z.string().optional(),
  domain: z.string().optional(),
});

export const bitrixScreeningWidgetBootstrapSchema =
  bitrixWidgetContextAuthSchema;

const bitrixWidgetUploadFileSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileData: z.string().min(1),
});

export const bitrixScreeningWidgetUploadBatchSchema =
  bitrixWidgetContextAuthSchema.extend({
    files: z.array(bitrixWidgetUploadFileSchema).min(1).max(25),
    description: z.string().optional(),
    category: z.nativeEnum(DealDocumentCategory).default("OTHER"),
  });

export const bitrixScreeningWidgetStartRunSchema =
  bitrixWidgetContextAuthSchema.extend({
    screenerId: z.string().min(1),
  });

/** Load answers + metadata for one screening run (widget auth). */
export const bitrixScreeningWidgetRunDetailSchema =
  bitrixWidgetContextAuthSchema.extend({
    runId: z.string().min(1),
  });

export const bitrixScreeningWidgetRetryCommentSchema =
  bitrixWidgetContextAuthSchema.extend({
    dealOpportunityId: z.string().min(1),
    runId: z.string().min(1),
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
