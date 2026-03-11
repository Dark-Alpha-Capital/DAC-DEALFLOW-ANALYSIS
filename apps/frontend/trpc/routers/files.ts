import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents } from "@repo/db";
import { uploadBuffer } from "@repo/nextcloud";
import { revalidateTag } from "next/cache";
import { ragIngestionQueue } from "@/lib/queue-client";
import { randomUUID } from "crypto";

const uploadFileSchema = z.object({
  entityType: z.enum(["LEAD", "COMPANY", "DEAL_OPPORTUNITY", "THEME"]),
  entityId: z.string().min(1, "entityId is required"),
  fileData: z.string(),
  fileName: z.string().min(1, "fileName is required"),
  fileType: z.string().optional(),
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
      await ragIngestionQueue.add(
        "ingest",
        {
          jobId: ragJobId,
          documentId: documentRecord.id,
          userId,
        },
        { jobId: ragJobId },
      );

      // Revalidate cache based on entity type (matches cacheTag in entity detail pages)
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
      for (const tag of tags) {
        revalidateTag(tag, "max");
      }

      return {
        success: true,
        documentId: documentRecord.id,
        fileUrl,
      };
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
      await ragIngestionQueue.add(
        "ingest",
        {
          jobId: ragJobId,
          documentId: documentRecord.id,
          userId,
        },
        { jobId: ragJobId },
      );

      revalidateTag("documents", "max");

      return {
        success: true,
        documentId: documentRecord.id,
        fileUrl,
      };
    }),
});
