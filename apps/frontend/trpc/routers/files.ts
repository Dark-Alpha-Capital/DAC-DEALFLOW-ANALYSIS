import { z } from "zod";
import { eq } from "drizzle-orm";
import AdmZip from "adm-zip";
import { after } from "@/lib/after";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents } from "@repo/db";
import { uploadBuffer, deleteFile, sanitizeFilename } from "@repo/nextcloud";
import { revalidateTag } from "@/lib/cache-invalidation";
import {
  insertWorkflowJob,
  startRagIngestionWorkflow,
} from "@/src/lib/workflow-jobs-api";
import { randomUUID } from "crypto";

const MAX_ZIP_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 200;
const ZIP_BATCH_SIZE = 10;

const ENTITY_SEGMENTS: Record<string, string> = {
  COMPANY: "companies",
  DEAL_OPPORTUNITY: "deal_opportunity",
};

function sanitizePathSegment(segment: string): string {
  return sanitizeFilename(segment) || "file";
}

function buildSafeRelativePath(entryPath: string): string | null {
  const normalized = entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  const safeSegments = segments.map(sanitizePathSegment);
  return safeSegments.join("/");
}

const uploadFileSchema = z.object({
  entityType: z.enum(["LEAD", "COMPANY", "DEAL_OPPORTUNITY", "THEME"]),
  entityId: z.string().min(1, "entityId is required"),
  fileData: z.string(),
  fileName: z.string().min(1, "fileName is required"),
  fileType: z.string().optional(),
});

const uploadZipSchema = z.object({
  entityType: z.enum(["COMPANY", "DEAL_OPPORTUNITY"]),
  entityId: z.string().min(1, "entityId is required"),
  fileData: z.string(),
  fileName: z.string().min(1, "fileName is required"),
});

const uploadGlobalDocumentSchema = z.object({
  category: z.enum([
    "OPERATING_PLAYBOOK",
    "INVESTMENT_MEMO",
    "IC_TEMPLATE",
    "INDUSTRY_RESEARCH",
    "VALUE_CREATION_PLAYBOOK",
    "PAST_DEAL_ANALYSIS",
    "DUE_DILIGENCE_CHECKLIST",
  ]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  fileData: z.string(),
  fileName: z.string().min(1, "fileName is required"),
  fileType: z.string().optional(),
});

const getEntityPathSegment = (
  entityType: "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY" | "THEME",
) => {
  if (entityType === "DEAL_OPPORTUNITY") return "deal_opportunity";
  return entityType.toLowerCase();
};

export const filesRouter = createTRPCRouter({
  uploadFile: protectedProcedure
    .input(uploadFileSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      if (!userId || userId.trim() === "") {
        throw new Error("User ID is required but not found in session");
      }

      // Decode base64 file data
      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");

      const entitySegment = getEntityPathSegment(input.entityType);
      const finalPath = `dealflow/${entitySegment}/${input.entityId}/${input.fileName}`;

      // Upload file to Nextcloud
      const fileUrl = await uploadBuffer(buffer, finalPath);
      const mimeType = input.fileType || "application/octet-stream";

      const [documentRecord] = await db
        .insert(documents)
        .values({
          entityType: input.entityType,
          entityId: input.entityId,
          companyId:
            input.entityType === "COMPANY" ? input.entityId : undefined,
          leadId:
            input.entityType === "LEAD" ? input.entityId : undefined,
          dealOpportunityId:
            input.entityType === "DEAL_OPPORTUNITY"
              ? input.entityId
              : undefined,
          themeId:
            input.entityType === "THEME" ? input.entityId : undefined,
          title: input.fileName,
          description: null,
          fileUrl,
          fileName: input.fileName,
          fileSize: buffer.length,
          mimeType,
          uploadedById: userId,
        })
        .returning();

      const ragJobId = randomUUID();
      await insertWorkflowJob({
        instanceId: ragJobId,
        workflowKind: "rag-ingestion",
        userId,
        dealId: input.entityId,
        fileName: input.fileName,
      });
      await startRagIngestionWorkflow(ragJobId, {
        documentId: documentRecord.id,
        userId,
      });

      const tags: string[] = [];
      switch (input.entityType) {
        case "COMPANY":
          tags.push(`company-${input.entityId}`, "companies");
          break;
        case "DEAL_OPPORTUNITY":
          tags.push(`deal-${input.entityId}`, "deals");
          break;
        case "LEAD":
          tags.push(`lead-${input.entityId}`, "leads");
          break;
        case "THEME":
          tags.push(`theme-${input.entityId}`, "themes");
          break;
      }
      tags.push("documents");
      after(async () => {
        for (const tag of tags) {
          revalidateTag(tag, "max");
        }
      });

      return {
        success: true,
        documentId: documentRecord.id,
        fileUrl,
      };
    }),

  uploadZip: protectedProcedure
    .input(uploadZipSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId || userId.trim() === "") {
        throw new Error("User ID is required but not found in session");
      }

      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > MAX_ZIP_SIZE_BYTES) {
        throw new Error(`Zip exceeds max size of ${MAX_ZIP_SIZE_BYTES / 1024 / 1024}MB`);
      }

      let zip: AdmZip;
      try {
        zip = new AdmZip(buffer);
      } catch {
        throw new Error("Invalid or corrupted zip file");
      }

      const entries = zip.getEntries();
      const entitySegment = ENTITY_SEGMENTS[input.entityType];
      const basePath = `dealflow/${entitySegment}/${input.entityId}`;

      const fileEntries: { safeRelative: string; fileBuffer: Buffer }[] = [];
      for (const entry of entries) {
        if (fileEntries.length >= MAX_FILES) break;
        if (entry.isDirectory) continue;
        if (entry.entryName.includes("__MACOSX") || entry.entryName.endsWith(".DS_Store")) continue;

        const safeRelative = buildSafeRelativePath(entry.entryName);
        if (!safeRelative) continue;

        const fileBuffer = entry.getData();
        if (!fileBuffer || fileBuffer.length === 0) continue;

        fileEntries.push({ safeRelative, fileBuffer: Buffer.from(fileBuffer) });
      }

      const documentIds: string[] = [];
      for (let i = 0; i < fileEntries.length; i += ZIP_BATCH_SIZE) {
        const batch = fileEntries.slice(i, i + ZIP_BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async ({ safeRelative, fileBuffer }) => {
            const finalPath = `${basePath}/${safeRelative}`;
            const fileUrl = await uploadBuffer(fileBuffer, finalPath);
            const fileName = safeRelative.split("/").pop() ?? "file";

            const [doc] = await db
              .insert(documents)
              .values({
                entityType: input.entityType,
                entityId: input.entityId,
                companyId: input.entityType === "COMPANY" ? input.entityId : undefined,
                dealOpportunityId: input.entityType === "DEAL_OPPORTUNITY" ? input.entityId : undefined,
                title: fileName,
                description: null,
                fileUrl,
                fileName,
                fileSize: fileBuffer.length,
                mimeType: "application/octet-stream",
                uploadedById: userId,
              })
              .returning();

            if (doc) {
              const ragJobId = randomUUID();
              await insertWorkflowJob({
                instanceId: ragJobId,
                workflowKind: "rag-ingestion",
                userId,
                dealId: input.entityId,
                fileName: fileName,
              });
              await startRagIngestionWorkflow(ragJobId, {
                documentId: doc.id,
                userId,
              });
              return doc.id;
            }
            return null;
          }),
        );
        documentIds.push(...results.filter((id): id is string => id !== null));
      }

      const tags: string[] =
        input.entityType === "COMPANY"
          ? [`company-${input.entityId}`, "companies"]
          : [`deal-${input.entityId}`, "deals"];
      tags.push("documents");
      after(async () => {
        for (const tag of tags) {
          revalidateTag(tag, "max");
        }
      });

      return { success: true, documentIds, count: documentIds.length };
    }),

  uploadGlobalDocument: protectedProcedure
    .input(uploadGlobalDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      if (!userId || userId.trim() === "") {
        throw new Error("User ID is required but not found in session");
      }

      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");

      const finalPath = `dealflow/global/${input.category}/${input.fileName}`;

      const fileUrl = await uploadBuffer(buffer, finalPath);
      const mimeType = input.fileType || "application/octet-stream";

      const [documentRecord] = await db
        .insert(documents)
        .values({
          entityType: "GLOBAL",
          entityId: null,
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          fileUrl,
          fileName: input.fileName,
          fileSize: buffer.length,
          mimeType,
          uploadedById: userId,
        })
        .returning();

      const ragJobId = randomUUID();
      await insertWorkflowJob({
        instanceId: ragJobId,
        workflowKind: "rag-ingestion",
        userId,
        fileName: input.fileName,
      });
      await startRagIngestionWorkflow(ragJobId, {
        documentId: documentRecord.id,
        userId,
      });

      after(async () => {
        revalidateTag("documents", "max");
      });

      return {
        success: true,
        documentId: documentRecord.id,
        fileUrl,
      };
    }),

  updateDocument: protectedProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ input }) => {
      const { documentId, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;

      if (Object.keys(updateData).length === 0) {
        return { success: true };
      }

      await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, documentId));

      after(async () => {
        revalidateTag("documents", "max");
      });
      return { success: true };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [doc] = await db
        .select({
          fileUrl: documents.fileUrl,
          entityType: documents.entityType,
          entityId: documents.entityId,
          companyId: documents.companyId,
          dealOpportunityId: documents.dealOpportunityId,
        })
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1);

      if (!doc) {
        throw new Error("Document not found");
      }

      await Promise.all([
        deleteFile(doc.fileUrl),
        db.delete(documents).where(eq(documents.id, input.documentId)),
      ]);

      const tag = doc.entityId
        ? doc.entityType === "DEAL_OPPORTUNITY"
          ? `deal-${doc.dealOpportunityId ?? doc.entityId}`
          : doc.entityType === "COMPANY"
            ? `company-${doc.companyId ?? doc.entityId}`
            : doc.entityType === "LEAD"
              ? `lead-${doc.entityId}`
              : doc.entityType === "THEME"
                ? `theme-${doc.entityId}`
                : null
        : null;
      after(async () => {
        revalidateTag("documents", "max");
        if (tag) revalidateTag(tag, "max");
      });
      return { success: true };
    }),
});
