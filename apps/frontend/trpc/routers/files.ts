import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents } from "db";
import { uploadBuffer } from "@repo/nextcloud";
import { updateTag } from "next/cache";

const uploadFileSchema = z.object({
  entityType: z.enum(["LEAD", "COMPANY", "DEAL_OPPORTUNITY"]),
  entityId: z.string().min(1, "entityId is required"),
  fileData: z.string(),
  fileName: z.string().min(1, "fileName is required"),
  fileType: z.string().optional(),
});

const getEntityPathSegment = (entityType: "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY") => {
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
          title: input.fileName,
          description: null,
          fileUrl,
          fileName: input.fileName,
          fileSize: buffer.length,
          mimeType,
          uploadedById: userId,
        })
        .returning();

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
      }
      for (const tag of tags) {
        updateTag(tag);
      }

      return {
        success: true,
        documentId: documentRecord.id,
        fileUrl,
      };
    }),
});

