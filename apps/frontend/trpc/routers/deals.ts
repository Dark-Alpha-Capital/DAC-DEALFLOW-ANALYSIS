import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import db, {
  deals,
  dealOpportunities,
  companies,
  eq,
  DealType,
  DealStatus,
  documents,
  and,
  DealDocumentCategory,
  DocumentCategory,
  ReviewState,
} from "@repo/db";
import { DeleteDealById, BulkDeleteDeals } from "@repo/db/mutations";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  fileUploadQueue,
  type FileUploadJobData,
  type EntityMetadata,
} from "@/lib/queue-client";
import { randomUUID } from "crypto";
import {
  GetDealById,
  GetDealOpportunityById,
  GetDealOpportunityByLegacyDealId,
} from "@repo/db/queries";
import { uploadBuffer } from "@repo/nextcloud";
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
  reviewState: z.enum([
    "NOT_SEEN",
    "SEEN",
    "REVIEWED",
    "PUBLISHED",
  ] as const),
  status: z.nativeEnum(DealStatus),
});

const createDealOpportunitySchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  leadId: z.string().optional(),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  dealTeaser: z.string().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

const updateOpportunityStageSchema = z.object({
  id: z.string(),
  stage: z.enum([
    "LISTED",
    "INITIAL_REVIEW",
    "SCREENED",
    "MEETING_HELD",
    "IOI_SUBMITTED",
    "LOI_SUBMITTED",
    "DILIGENCE",
    "CLOSED",
    "DEAD",
  ]),
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

  createOpportunity: protectedProcedure
    .input(createDealOpportunitySchema)
    .mutation(async ({ input, ctx }) => {
      const [added] = await db
        .insert(dealOpportunities)
        .values({
          companyId: input.companyId,
          leadId: input.leadId || null,
          sourceWebsite: input.sourceWebsite || null,
          brokerage: input.brokerage || null,
          revenue: input.revenue ?? null,
          ebitda: input.ebitda ?? null,
          ebitdaMargin: input.ebitdaMargin ?? null,
          askingPrice: input.askingPrice ?? null,
          dealTeaser: input.dealTeaser || null,
          description: input.description || null,
          brokerFirstName: input.brokerFirstName || null,
          brokerLastName: input.brokerLastName || null,
          brokerEmail: input.brokerEmail || null,
          brokerPhone: input.brokerPhone || null,
          brokerLinkedIn: input.brokerLinkedIn || null,
          userId: ctx.user.id,
        })
        .returning();

      revalidatePath("/deals");
      revalidateTag("deals", "max");
      return { dealOpportunityId: added?.id };
    }),

  updateOpportunityStage: protectedProcedure
    .input(updateOpportunityStageSchema)
    .mutation(async ({ input }) => {
      await db
        .update(dealOpportunities)
        .set({ stage: input.stage })
        .where(eq(dealOpportunities.id, input.id));

      revalidatePath("/deals");
      revalidateTag("deals", "max");
      revalidateTag(`deal-${input.id}`, "max");

      return { dealOpportunityId: input.id, stage: input.stage };
    }),

  updateOpportunity: protectedProcedure
    .input(createDealOpportunitySchema.extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db
        .update(dealOpportunities)
        .set({
          companyId: data.companyId,
          leadId: data.leadId || null,
          sourceWebsite: data.sourceWebsite || null,
          brokerage: data.brokerage || null,
          revenue: data.revenue ?? null,
          ebitda: data.ebitda ?? null,
          ebitdaMargin: data.ebitdaMargin ?? null,
          askingPrice: data.askingPrice ?? null,
          dealTeaser: data.dealTeaser || null,
          description: data.description || null,
          brokerFirstName: data.brokerFirstName || null,
          brokerLastName: data.brokerLastName || null,
          brokerEmail: data.brokerEmail || null,
          brokerPhone: data.brokerPhone || null,
          brokerLinkedIn: data.brokerLinkedIn || null,
        })
        .where(eq(dealOpportunities.id, id));

      revalidatePath("/deals");
      revalidatePath(`/deals/${id}`);
      revalidatePath(`/deals/${id}/edit`);
      revalidateTag("deals", "max");
      revalidateTag(`deal-${id}`, "max");
      return { dealOpportunityId: id };
    }),

  deleteOpportunity: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(dealOpportunities).where(eq(dealOpportunities.id, input.id));
      revalidatePath("/deals");
      revalidateTag("deals", "max");
      revalidateTag(`deal-${input.id}`, "max");
      return { success: true };
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
      const { dealId, reviewState, status } = input;

      let opp = await GetDealOpportunityById(dealId);
      if (!opp) {
        opp = await GetDealOpportunityByLegacyDealId(dealId);
      }
      if (opp) {
        await db
          .update(dealOpportunities)
          .set({ reviewState: reviewState as ReviewState, status })
          .where(eq(dealOpportunities.id, dealId));
        revalidatePath(`/deals/${dealId}`);
      } else {
        await db
          .update(deals)
          .set({ reviewState: reviewState as ReviewState, status })
          .where(eq(deals.id, dealId));
        revalidatePath(`/raw-deals/${dealId}`);
      }

      revalidateTag(`deal-${dealId}`, "max");
      revalidateTag("deals", "max");
      revalidatePath("/raw-deals");
      revalidatePath("/deals");

      return { success: true, dealId };
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

      // Resolve to DealOpportunity (or fallback to legacy Deal)
      const opp = await GetDealOpportunityByLegacyDealId(input.dealId);
      const deal = !opp ? await GetDealById(input.dealId) : null;

      if (!opp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Deal not migrated. Run db:migrate-deals first.",
        });
      }

      const entityId = opp.id;
      const entityType = "DEAL_OPPORTUNITY" as const;

      let entityMetadata: EntityMetadata;
      {
        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, opp.companyId));
        entityMetadata = {
          name: company?.name ?? "Unknown Deal",
          sector: company?.industry ?? null,
          stage: null,
          headquarters: company?.location ?? null,
          revenue: company?.revenueEstimate
            ? parseFloat(String(company.revenueEstimate))
            : null,
          ebitda: company?.ebitdaEstimate
            ? parseFloat(String(company.ebitdaEstimate))
            : null,
        };
      }

      const finalDir = `dealflow/raw-deals/${input.dealId}`;

      // Generate a unique jobId for this job
      const jobId = randomUUID();

      // Convert base64 to buffer
      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");

      // Upload file directly to final Nextcloud location
      const finalPath = `${finalDir}/${input.fileName}`;

      try {
        await uploadBuffer(buffer, finalPath);
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
        entityType: "DEAL" as const,
        entityId,
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
});
