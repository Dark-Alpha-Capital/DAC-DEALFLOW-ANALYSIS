import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents, and, eq } from "db";
import { revalidatePath, updateTag } from "next/cache";
import { TRPCError } from "@trpc/server";
import { deleteFileFromNextCloud, getFileDownloadUrl } from "@/lib/storage";
import {
  fileUploadQueue,
  type FileUploadJobData,
  type EntityMetadata,
} from "@/lib/queue-client";
import { randomUUID } from "crypto";
import { getCompanyById } from "db/queries";
import { createClient } from "webdav";

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

  /**
   * Bulk upload files for a company
   */
  bulkUpload: protectedProcedure
    .input(
      z.object({
        companyId: z.string().min(1, "Company ID is required"),
        files: z
          .array(
            z.object({
              fileData: z.string(), // base64 encoded file
              fileName: z.string(),
              fileType: z.string(),
              fileSize: z.number(),
            }),
          )
          .min(1, "At least one file is required"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Validate userId exists
      if (!userId || userId.trim() === "") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required but not found in session",
        });
      }

      console.log("[bulk-upload] User authenticated", { userId });

      // Validate required fields
      if (!input.companyId || input.companyId.trim() === "") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "companyId is required",
        });
      }

      if (!input.files.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No files uploaded",
        });
      }

      // Fetch company details once for all files
      const company = await getCompanyById(input.companyId);
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found",
        });
      }

      console.log("[bulk-upload] Company found", { company });

      // Extract entity metadata for job data
      const entityMetadata: EntityMetadata = {
        name: company.name,
        sector: company.sector,
        stage: company.stage,
        headquarters: company.headquarters,
        revenue: company.revenue ? parseFloat(company.revenue) : null,
        ebitda: company.ebitda ? parseFloat(company.ebitda) : null,
      };

      // Create Nextcloud client for file uploads
      const nextcloudClient = createClient(
        `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}`,
        {
          username: process.env.NEXTCLOUD_USER,
          password: process.env.NEXTCLOUD_PASSWORD,
        },
      );

      // Ensure final directory exists
      const finalDir = `Diligence/${input.companyId}`;
      try {
        await nextcloudClient.createDirectory(finalDir, { recursive: true });
      } catch (err) {
        // Directory might already exist, which is fine
        console.log("[bulk-upload] Final directory may already exist");
      }

      // Add jobs to BullMQ queue
      const jobPromises = input.files.map(async (fileInput, index) => {
        // Generate a unique jobId for this job
        const jobId = randomUUID();

        console.log(
          `[bulk-upload] Processing file ${index + 1}/${input.files.length}`,
          {
            jobId,
            name: fileInput.fileName,
            size: fileInput.fileSize,
          },
        );

        // Convert base64 to buffer
        const base64Data =
          fileInput.fileData.split(",")[1] || fileInput.fileData;
        const buffer = Buffer.from(base64Data, "base64");

        // Upload file directly to final Nextcloud location
        // This avoids the intermediate temp step and simplifies the flow
        const finalPath = `${finalDir}/${fileInput.fileName}`;

        try {
          await nextcloudClient.putFileContents(finalPath, buffer);

          console.log(`[bulk-upload] File uploaded to final location`, {
            jobId,
            finalPath,
            size: fileInput.fileSize,
          });
        } catch (uploadError) {
          console.error(
            `[bulk-upload] Failed to upload file for ${jobId}:`,
            uploadError,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to upload file to storage: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
          });
        }

        const mimeType = fileInput.fileType || "application/octet-stream";

        // Create job data - store final file path
        const jobData: FileUploadJobData = {
          jobId,
          fileName: fileInput.fileName,
          filePath: finalPath, // Path to final file in Nextcloud
          fileSize: fileInput.fileSize,
          mimeType,
          userId,
          entityType: "COMPANY",
          entityId: input.companyId,
          entityMetadata,
        };

        // Validate required fields
        if (!jobData.userId || jobData.userId.trim() === "") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `userId is required but was not provided for job ${jobId}`,
          });
        }

        if (!jobData.entityId || jobData.entityId.trim() === "") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `entityId is required but was not provided for job ${jobId}`,
          });
        }

        if (!jobData.entityMetadata) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `entityMetadata is required but was not provided for job ${jobId}`,
          });
        }

        // Log job data before queueing
        console.log(`[bulk-upload] Queueing job with data:`, {
          jobId: jobData.jobId,
          fileName: jobData.fileName,
          userId: jobData.userId,
          entityType: jobData.entityType,
          entityId: jobData.entityId,
          entityMetadata: jobData.entityMetadata,
          dataKeys: Object.keys(jobData),
        });

        // Add job to queue - pass data directly
        const job = await fileUploadQueue.add("upload", jobData, {
          jobId, // Use our own jobId for easier tracking
        });

        console.log(`[bulk-upload] Job ${job.id} added to queue successfully`, {
          fileName: fileInput.fileName,
        });

        return { jobId, fileName: fileInput.fileName, bullmqJobId: job.id };
      });

      const queuedJobs = await Promise.all(jobPromises);
      console.log(
        `[bulk-upload] All ${queuedJobs.length} jobs added to BullMQ queue`,
      );

      // Revalidate cache tags for company page
      // This ensures the page shows updated file count immediately
      updateTag(`company-${input.companyId}`);
      updateTag("companies");

      console.log(
        `[bulk-upload] Cache tags revalidated: company-${input.companyId}, companies`,
      );

      return {
        ok: true,
        message: "Bulk upload queued",
        jobs: queuedJobs.map((j) => ({ jobId: j.jobId, fileName: j.fileName })),
        companyId: input.companyId,
        companyName: company.name,
      };
    }),
});
