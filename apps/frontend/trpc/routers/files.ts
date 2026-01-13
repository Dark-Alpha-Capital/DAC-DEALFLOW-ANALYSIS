import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents, and, eq } from "db";
import { revalidatePath } from "next/cache";
import { TRPCError } from "@trpc/server";
import { deleteFileFromNextCloud, getFileDownloadUrl } from "@/lib/storage";

export const filesRouter = createTRPCRouter({
  /**
   * Get file view URL - opens file in new tab
   */
  getViewUrl: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ input }) => {
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, input.fileId),
            eq(documents.entityType, "COMPANY"),
          ),
        )
        .limit(1);

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return { viewUrl: document.fileUrl };
    }),

  /**
   * Get file download URL
   */
  getDownloadUrl: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ input }) => {
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, input.fileId),
            eq(documents.entityType, "COMPANY"),
          ),
        )
        .limit(1);

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      const downloadUrl = getFileDownloadUrl(document.fileUrl);
      return { downloadUrl, fileName: document.fileName };
    }),

  /**
   * Delete a file from Nextcloud and database
   */
  delete: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        companyId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Get document record first
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, input.fileId),
            eq(documents.entityType, "COMPANY"),
            eq(documents.entityId, input.companyId),
          ),
        )
        .limit(1);

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      // Delete from Nextcloud first
      const deletedFromNextcloud = await deleteFileFromNextCloud(
        document.fileUrl,
      );

      if (!deletedFromNextcloud) {
        // Log warning but continue with database deletion
        console.warn(
          `Failed to delete file from Nextcloud, but continuing with database deletion: ${document.fileUrl}`,
        );
      }

      // Delete from database
      await db.delete(documents).where(eq(documents.id, input.fileId));

      // Revalidate the company page
      revalidatePath(`/companies/${input.companyId}`);

      return { success: true };
    }),
});
