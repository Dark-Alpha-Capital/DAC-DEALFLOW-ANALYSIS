import { TRPCError } from "@trpc/server";
import {
  deleteDocumentInputSchema,
  updateDocumentInputSchema,
  uploadFileSchema,
  uploadGlobalDocumentSchema,
} from "@/lib/zod-schemas/files-router";
import { eq } from "drizzle-orm";
import { after } from "@/lib/after";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents, DocumentCategory } from "@repo/db";
import { uploadBuffer, deleteFile } from "@repo/nextcloud";
import { revalidateTag } from "@/lib/cache-invalidation";
import {
  insertWorkflowJob,
  startRagIngestionWorkflow,
} from "@/src/lib/workflow-jobs-api";
import { randomUUID } from "crypto";

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
          title: input.title,
          description: input.description?.trim() ? input.description.trim() : null,
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

  uploadGlobalDocument: protectedProcedure
    .input(uploadGlobalDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      if (!userId || userId.trim() === "") {
        throw new Error("User ID is required but not found in session");
      }

      if (
        input.category === "CIM" &&
        !input.fileName.toLowerCase().endsWith(".pdf")
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CIM uploads must be PDF files",
        });
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
    .input(updateDocumentInputSchema)
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
    .input(deleteDocumentInputSchema)
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
