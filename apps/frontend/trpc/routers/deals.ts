import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import db, {
  deals,
  eq,
  DealType,
  DealStatus,
  dealDocuments,
  documents,
  and,
  DealDocumentCategory,
  DocumentCategory,
} from "db";
import { DeleteDealById, BulkDeleteDeals } from "db/mutations";
import { revalidatePath, revalidateTag } from "next/cache";
import { uploadFileToNextCloud } from "@/lib/storage";
import {
  createConvertDealToCompanyJob,
  type ConvertDealToCompanyJobData,
  fileUploadQueue,
  type FileUploadJobData,
  type EntityMetadata,
} from "@/lib/queue-client";
import crypto from "crypto";
import { randomUUID } from "crypto";
import { GetDealById } from "db/queries";
import { createClient } from "webdav";
import { TRPCError } from "@trpc/server";

const createDealSchema = z.object({
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

const updateDealSchema = z.object({
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

const updateTagsSchema = z.object({
  dealId: z.string(),
  tags: z.array(z.string()).min(1, "At least one tag is required"),
});

const updateSpecificationsSchema = z.object({
  dealId: z.string(),
  isReviewed: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  seen: z.boolean().default(false),
  status: z.nativeEnum(DealStatus),
});

const uploadDealDocumentSchema = z.object({
  dealId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(DealDocumentCategory),
  tags: z.array(z.string()).optional().default([]),
  fileData: z.string(), // base64 encoded file
  fileName: z.string(),
  fileType: z.string(),
});

export const dealsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createDealSchema)
    .mutation(async ({ input, ctx }) => {
      const [addedDeal] = await db
        .insert(deals)
        .values({
          title: input.title,
          dealCaption: input.deal_caption,
          firstName: input.first_name,
          lastName: input.last_name,
          email: input.email,
          linkedinUrl: input.linkedinurl,
          workPhone: input.work_phone,
          revenue: input.revenue,
          ebitda: input.ebitda,
          ebitdaMargin: input.ebitda_margin,
          grossRevenue: input.gross_revenue,
          companyLocation: input.company_location,
          brokerage: input.brokerage,
          sourceWebsite: input.source_website || "",
          industry: input.industry,
          askingPrice: input.asking_price,
          dealType: DealType.MANUAL,
          userId: ctx.user.id,
        })
        .returning();

      revalidatePath("/manual-deals");
      revalidateTag("deals", "max");

      return { dealId: addedDeal?.id };
    }),

  update: protectedProcedure
    .input(updateDealSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      await db
        .update(deals)
        .set({
          title: data.title,
          dealCaption: data.deal_caption,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          linkedinUrl: data.linkedinurl,
          workPhone: data.work_phone,
          revenue: data.revenue,
          ebitda: data.ebitda,
          ebitdaMargin: data.ebitda_margin,
          grossRevenue: data.gross_revenue,
          companyLocation: data.company_location,
          brokerage: data.brokerage,
          sourceWebsite: data.source_website || "",
          industry: data.industry,
          askingPrice: data.asking_price,
        })
        .where(eq(deals.id, id));

      revalidatePath(`/raw-deals/${id}`);

      return { dealId: id };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string(), dealType: z.nativeEnum(DealType) }))
    .mutation(async ({ input }) => {
      await DeleteDealById(input.id);

      revalidatePath("/raw-deals");

      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ dealIds: z.array(z.string()).min(1) }))
    .mutation(async ({ input }) => {
      await BulkDeleteDeals(input.dealIds);

      revalidatePath("/raw-deals");

      return { success: true };
    }),

  updateTags: protectedProcedure
    .input(updateTagsSchema)
    .mutation(async ({ input }) => {
      await db
        .update(deals)
        .set({ tags: input.tags })
        .where(eq(deals.id, input.dealId));

      revalidatePath(`/raw-deals/${input.dealId}`);
      revalidatePath("/raw-deals");

      return { success: true };
    }),

  updateSpecifications: protectedProcedure
    .input(updateSpecificationsSchema)
    .mutation(async ({ input }) => {
      const { dealId, ...data } = input;

      await db
        .update(deals)
        .set({
          seen: data.seen,
          status: data.status,
          isReviewed: data.isReviewed,
          isPublished: data.isPublished,
        })
        .where(eq(deals.id, dealId));

      revalidatePath(`/raw-deals/${dealId}`);
      revalidatePath("/raw-deals");

      return { success: true };
    }),

  uploadDocument: protectedProcedure
    .input(uploadDealDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Validate userId exists
      if (!userId || userId.trim() === "") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required but not found in session",
        });
      }

      // Validate required fields
      if (!input.dealId || input.dealId.trim() === "") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "dealId is required",
        });
      }

      // Fetch deal details for entity metadata
      const deal = await GetDealById(input.dealId);
      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      // Extract entity metadata for job data
      const entityMetadata: EntityMetadata = {
        name: deal.dealCaption || deal.title || "Unknown Deal",
        sector: deal.industry || null,
        stage: null, // Deals don't have stage
        headquarters: deal.companyLocation || null,
        revenue: deal.revenue ? parseFloat(String(deal.revenue)) : null,
        ebitda: deal.ebitda ? parseFloat(String(deal.ebitda)) : null,
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
      const finalDir = `dealflow/raw-deals/${input.dealId}`;
      try {
        await nextcloudClient.createDirectory(finalDir, { recursive: true });
      } catch (err) {
        // Directory might already exist, which is fine
        console.log("[deal-upload] Final directory may already exist");
      }

      // Generate a unique jobId for this job
      const jobId = randomUUID();

      // Convert base64 to buffer
      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");

      // Upload file directly to final Nextcloud location
      const finalPath = `${finalDir}/${input.fileName}`;

      try {
        await nextcloudClient.putFileContents(finalPath, buffer);

        console.log(`[deal-upload] File uploaded to final location`, {
          jobId,
          finalPath,
          size: buffer.length,
        });
      } catch (uploadError) {
        console.error(
          `[deal-upload] Failed to upload file for ${jobId}:`,
          uploadError,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload file to storage: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
        });
      }

      const mimeType = input.fileType || "application/octet-stream";

      // Map DealDocumentCategory to DocumentCategory (they share most values)
      const category = (input.category as DocumentCategory) || "OTHER";

      // Create job data - store final file path
      const jobData: FileUploadJobData = {
        jobId,
        fileName: input.fileName,
        filePath: finalPath, // Path to final file in Nextcloud
        fileSize: buffer.length,
        mimeType,
        userId,
        entityType: "DEAL",
        entityId: input.dealId,
        entityMetadata,
        embedInVectorStore: true, // Enable Google File Search Store for deals
        fileCategory: category,
        fileDescription: input.description,
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
      console.log(`[deal-upload] Queueing job with data:`, {
        jobId: jobData.jobId,
        fileName: jobData.fileName,
        userId: jobData.userId,
        entityType: jobData.entityType,
        entityId: jobData.entityId,
        entityMetadata: jobData.entityMetadata,
      });

      // Add job to queue - pass data directly
      const job = await fileUploadQueue.add("upload", jobData, {
        jobId, // Use our own jobId for easier tracking
      });

      console.log(`[deal-upload] Job ${job.id} added to queue successfully`, {
        fileName: input.fileName,
      });

      revalidateTag(`deal-${input.dealId}`, "max");
      revalidatePath(`/raw-deals/${input.dealId}`);

      return {
        success: true,
        message: "File upload queued",
        jobId: job.id,
        fileName: input.fileName,
      };
    }),

  convertToCompany: protectedProcedure
    .input(z.object({ dealId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Generate unique job ID
      const jobId = crypto.randomUUID();

      // Create job data
      const jobData: ConvertDealToCompanyJobData = {
        jobId,
        dealId: input.dealId,
        userId: ctx.session.user.id,
      };

      // Enqueue background job
      const job = await createConvertDealToCompanyJob(jobData);

      console.log(
        `[convert-deal] Queued conversion job ${job.jobId} for deal ${input.dealId}`,
      );

      // Revalidate paths (job will complete in background)
      revalidatePath("/raw-deals");
      revalidatePath("/companies");

      // Return job ID for progress tracking (not company ID - will be available when job completes)
      return {
        success: true,
        jobId: job.jobId,
        queueName: job.queueName,
      };
    }),
});
