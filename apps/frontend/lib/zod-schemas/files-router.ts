import { z } from "zod";
import { DocumentCategory } from "@repo/db";

export const uploadFileSchema = z.object({
  entityType: z.enum(["LEAD", "COMPANY", "DEAL_OPPORTUNITY", "THEME"]),
  entityId: z.string().min(1, "entityId is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.nativeEnum(DocumentCategory),
  fileData: z.string(),
  fileName: z.string().min(1, "fileName is required"),
  fileType: z.string().optional(),
});

export const uploadGlobalDocumentSchema = z.object({
  category: z.enum([
    "OPERATING_PLAYBOOK",
    "INVESTMENT_MEMO",
    "IC_TEMPLATE",
    "INDUSTRY_RESEARCH",
    "VALUE_CREATION_PLAYBOOK",
    "PAST_DEAL_ANALYSIS",
    "DUE_DILIGENCE_CHECKLIST",
    "CIM",
  ]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  fileData: z.string(),
  fileName: z.string().min(1, "fileName is required"),
  fileType: z.string().optional(),
});

export const updateDocumentInputSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z
    .enum([
      "FINANCIALS",
      "LEGAL",
      "TAX",
      "TECHNICAL",
      "COMMERCIAL",
      "ESG",
      "MARKETING",
      "OPERATIONS",
      "DOCUMENTATION",
      "INVESTOR_RELATIONSHIPS",
      "TOOLS",
      "LEGISLATION",
      "RESEARCH",
      "PROSPECTUS",
      "OTHER",
      "OPERATING_PLAYBOOK",
      "INVESTMENT_MEMO",
      "IC_TEMPLATE",
      "INDUSTRY_RESEARCH",
      "VALUE_CREATION_PLAYBOOK",
      "PAST_DEAL_ANALYSIS",
      "DUE_DILIGENCE_CHECKLIST",
      "SIM_SCREENING",
    ])
    .optional(),
});

export const deleteDocumentInputSchema = z
  .object({
    documentId: z.string().min(1),
    /** When set, server verifies the document belongs to this entity (deal/company scope). */
    entityType: z.enum(["COMPANY", "DEAL_OPPORTUNITY"]).optional(),
    entityId: z.string().min(1).optional(),
  })
  .refine(
    (d) =>
      (d.entityType === undefined && d.entityId === undefined) ||
      (d.entityType !== undefined && d.entityId !== undefined),
    { message: "Provide both entityType and entityId, or neither" },
  );
