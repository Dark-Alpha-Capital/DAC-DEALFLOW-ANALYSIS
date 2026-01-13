import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import db, {
  deals,
  eq,
  DealType,
  DealStatus,
  dealDocuments,
  DealDocumentCategory,
} from "db";
import { DeleteDealById, BulkDeleteDeals } from "db/mutations";
import { revalidatePath, updateTag } from "next/cache";
import { uploadFileToNextCloud } from "@/lib/storage";

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
      updateTag("deals");

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
    .mutation(async ({ input }) => {
      // Convert base64 to buffer
      const base64Data = input.fileData.split(",")[1] || input.fileData;
      const buffer = Buffer.from(base64Data, "base64");

      // Create a File object for Nextcloud upload
      const file = new File([buffer], input.fileName, { type: input.fileType });

      // Upload to Nextcloud with folder path: dealflow/raw-deals/[uid]
      const folderPath = `dealflow/raw-deals/${input.dealId}`;
      const downloadUrl = await uploadFileToNextCloud(file, folderPath);

      if (!downloadUrl) {
        throw new Error("Failed to upload file to Nextcloud");
      }

      // Save document metadata to database
      const [dealDocument] = await db
        .insert(dealDocuments)
        .values({
          title: input.title,
          description: input.description,
          category: input.category,
          documentUrl: downloadUrl,
          fileName: input.fileName,
          fileType: input.fileType,
          tags: input.tags || [],
          dealId: input.dealId,
        })
        .returning();

      revalidatePath(`/raw-deals/${input.dealId}`);

      return { success: true, dealDocument };
    }),
});
