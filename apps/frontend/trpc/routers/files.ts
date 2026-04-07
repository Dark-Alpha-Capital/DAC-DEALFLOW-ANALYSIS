import { TRPCError } from "@trpc/server";
import {
  deleteChunkVectorsForDocument,
  getDocumentChunksVectorIndex,
} from "@/lib/document-chunk-vectorize";
import {
  checkDocumentDuplicateSchema,
  deleteDocumentInputSchema,
  updateDocumentInputSchema,
  uploadFileSchema,
  uploadGlobalDocumentSchema,
} from "@/lib/zod-schemas/files-router";
import { and, eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents } from "@repo/db";
import { uploadBuffer, deleteFile } from "@repo/nextcloud";
import {
  insertWorkflowJob,
  startRagIngestionWorkflow,
} from "@/src/lib/workflow-jobs-api";
import { setWorkflowJobState } from "@repo/db/workflow-jobs";
import { createHash, randomUUID } from "crypto";

function isUniqueViolationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

const getEntityPathSegment = (
  entityType: "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY" | "THEME",
) => {
  if (entityType === "DEAL_OPPORTUNITY") return "deal_opportunity";
  return entityType.toLowerCase();
};

export const filesRouter = createTRPCRouter({
  checkDuplicate: protectedProcedure
    .input(checkDocumentDuplicateSchema)
    .query(async ({ input }) => {
      const [existingDocument] = await db
        .select({
          id: documents.id,
          title: documents.title,
          fileName: documents.fileName,
          entityType: documents.entityType,
          entityId: documents.entityId,
        })
        .from(documents)
        .where(
          input.scopeType === "GLOBAL"
            ? and(
              eq(documents.entityType, "GLOBAL"),
              eq(documents.contentHash, input.contentHash),
            )
            : and(
              eq(documents.contentHash, input.contentHash),
              input.entityType === "COMPANY"
                ? eq(documents.companyId, input.entityId)
                : input.entityType === "LEAD"
                  ? eq(documents.leadId, input.entityId)
                  : input.entityType === "DEAL_OPPORTUNITY"
                    ? eq(documents.dealOpportunityId, input.entityId)
                    : eq(documents.themeId, input.entityId),
            ),
        )
        .limit(1);

      return {
        isDuplicate: Boolean(existingDocument),
        existingDocument: existingDocument ?? null,
      };
    }),

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
      const contentHash = createHash("sha256").update(buffer).digest("hex");

      const [existingDocument] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.contentHash, contentHash),
            input.entityType === "COMPANY"
              ? eq(documents.companyId, input.entityId)
              : input.entityType === "LEAD"
                ? eq(documents.leadId, input.entityId)
                : input.entityType === "DEAL_OPPORTUNITY"
                  ? eq(documents.dealOpportunityId, input.entityId)
                  : eq(documents.themeId, input.entityId),
          ),
        )
        .limit(1);

      if (existingDocument) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This document was already uploaded for this entity",
        });
      }

      const entitySegment = getEntityPathSegment(input.entityType);
      const finalPath = `dealflow/${entitySegment}/${input.entityId}/${input.fileName}`;

      // Upload file to Nextcloud
      const fileUrl = await uploadBuffer(buffer, finalPath);
      const mimeType = input.fileType || "application/octet-stream";

      let documentRecord:
        | {
          id: string;
        }
        | undefined;
      try {
        [documentRecord] = await db
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
            description: input.description?.trim()
              ? input.description.trim()
              : null,
            category: input.category,
            fileUrl,
            fileName: input.fileName,
            fileSize: buffer.length,
            mimeType,
            contentHash,
            uploadedById: userId,
          })
          .returning({ id: documents.id });
      } catch (error) {
        if (isUniqueViolationError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This document was already uploaded for this entity",
          });
        }
        throw error;
      }
      if (!documentRecord) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save document record",
        });
      }

      const ragJobId = randomUUID();
      await insertWorkflowJob({
        instanceId: ragJobId,
        workflowKind: "rag-ingestion",
        userId,
        dealId: input.entityId,
        fileName: input.fileName,
      });
      try {
        await startRagIngestionWorkflow(ragJobId, {
          documentId: documentRecord.id,
          userId,
        });
      } catch (error) {
        await setWorkflowJobState(ragJobId, "failed", {
          failedReason:
            error instanceof Error ? error.message : "Failed to start workflow",
        });
        throw error;
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
      const contentHash = createHash("sha256").update(buffer).digest("hex");

      const [existingGlobalDocument] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.entityType, "GLOBAL"),
            eq(documents.contentHash, contentHash),
          ),
        )
        .limit(1);

      if (existingGlobalDocument) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This global document was already uploaded",
        });
      }

      const finalPath = `dealflow/global/${input.category}/${input.fileName}`;

      const fileUrl = await uploadBuffer(buffer, finalPath);
      const mimeType = input.fileType || "application/octet-stream";

      let documentRecord:
        | {
          id: string;
        }
        | undefined;
      try {
        [documentRecord] = await db
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
            contentHash,
            uploadedById: userId,
          })
          .returning({ id: documents.id });
      } catch (error) {
        if (isUniqueViolationError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This global document was already uploaded",
          });
        }
        throw error;
      }
      if (!documentRecord) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save document record",
        });
      }

      const ragJobId = randomUUID();
      await insertWorkflowJob({
        instanceId: ragJobId,
        workflowKind: "rag-ingestion",
        userId,
        fileName: input.fileName,
      });
      try {
        await startRagIngestionWorkflow(ragJobId, {
          documentId: documentRecord.id,
          userId,
        });
      } catch (error) {
        await setWorkflowJobState(ragJobId, "failed", {
          failedReason:
            error instanceof Error ? error.message : "Failed to start workflow",
        });
        throw error;
      }

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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      if (input.entityType && input.entityId) {
        const matchesScope =
          doc.entityType === input.entityType &&
          (input.entityType === "COMPANY"
            ? doc.entityId === input.entityId || doc.companyId === input.entityId
            : doc.entityId === input.entityId ||
            doc.dealOpportunityId === input.entityId);
        if (!matchesScope) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Document does not belong to this context",
          });
        }
      }

      try {
        const vectorIndex = getDocumentChunksVectorIndex();
        if (vectorIndex) {
          await deleteChunkVectorsForDocument(db, vectorIndex, input.documentId);
        }
      } catch (err) {
        console.error("[deleteDocument] Vectorize chunk cleanup failed", err);
      }

      await deleteFile(doc.fileUrl);

      await db.delete(documents).where(eq(documents.id, input.documentId));

      return { success: true };
    }),
});
