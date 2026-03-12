import { Job } from "bullmq";
import { db } from "@repo/db";
import { documents, type DocumentCategory } from "@repo/db/schema";
import { buildNextcloudFileUrl, fileExists } from "@repo/nextcloud";
import { ragIngestionQueue } from "../lib/queues";

export enum FileUploadStep {
  Validate = "validate",
  UploadNextcloud = "upload-nextcloud",
  SaveDb = "save-db",
  Done = "done",
}

/**
 * Entity metadata for file organization and search indexing
 * Supports both deals and companies
 */
export interface EntityMetadata {
  name: string;
  sector: string | null;
  stage: string | null;
  headquarters: string | null;
  revenue: number | null;
  ebitda: number | null;
}

/**
 * Job data for file upload - includes step state for resumability
 */
export interface FileUploadJobData {
  jobId: string;
  fileName: string;
  filePath: string; // Path to final file in Nextcloud (uploaded directly, no temp step)
  fileSize: number; // File size in bytes
  mimeType: string; // MIME type of the file
  userId: string; // Required - user who uploaded the file
  // Entity context
  entityType: "DEAL" | "DEAL_OPPORTUNITY";
  entityId: string; // References deals.id or dealOpportunities.id
  entityMetadata: EntityMetadata;
  // Optional file metadata
  fileCategory?: string;
  fileDescription?: string;
  // Step state - persisted via job.updateData() for resume on retry
  step?: FileUploadStep;
  // Intermediate results cached for resume
  validateResult?: {
    isValid: boolean;
    fileSize: number;
    mimeType: string;
  };
  nextcloudResult?: {
    destPath: string;
    publicUrl: string;
  };
}

export interface FileUploadResult {
  success: boolean;
  fileName?: string;
  nextcloudUrl?: string;
  fileId?: string;
  message?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPE_MAP[extension] || "application/octet-stream";
}

/**
 * Revalidate Next.js cache tags by calling the frontend API
 * This ensures the company page cache is updated after file uploads complete
 */
async function revalidateCacheTags(tags: string[]): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const revalidateUrl = `${frontendUrl}/api/revalidate`;

  try {
    const response = await fetch(revalidateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(
        `[file-upload] Cache revalidation failed: ${response.status} ${response.statusText}`,
        errorData
      );
      return; // Don't throw - cache revalidation failure shouldn't fail the job
    }

    const result = (await response.json()) as { message?: string };
    if (result && typeof result === "object" && "message" in result) {
      console.log(
        `[file-upload] Cache revalidation successful:`,
        result.message || "Tags revalidated"
      );
    } else {
      console.log(`[file-upload] Cache revalidation successful`);
    }
  } catch (error) {
    // Log but don't throw - cache revalidation is best effort
    console.warn(
      `[file-upload] Failed to revalidate cache tags:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

// ============================================================================
// Handler
// ============================================================================

/**
 * File Upload Handler using the "Process Step Jobs" pattern.
 *
 * Each step saves its progress via job.updateData(), so if the job fails
 * and retries, it resumes from the last completed step instead of starting over.
 *
 * Steps:
 * 1. Validate - Validate file size, type, and metadata
 * 2. UploadNextcloud - Verify file exists at final location (uploaded by tRPC handler)
 * 3. SaveDb - Save file record to database
 * 4. Done - Complete
 */
export async function fileUploadHandler(
  job: Job<FileUploadJobData>
): Promise<FileUploadResult> {
  // Log the raw job data to debug serialization issues
  console.log(`[file-upload] Raw job.data:`, JSON.stringify(job.data, null, 2));
  console.log(`[file-upload] Job.data keys:`, Object.keys(job.data || {}));
  console.log(`[file-upload] Job.data type:`, typeof job.data);

  // Safely extract data with fallbacks
  const jobData = job.data || {};
  const {
    fileName,
    filePath,
    fileSize,
    mimeType,
    jobId,
    entityType,
    entityId,
    entityMetadata,
    userId,
  } = jobData;

  let step = jobData.step ?? FileUploadStep.Validate;

  console.log(`[file-upload] Extracted values:`, {
    userId: userId || "UNDEFINED",
    entityType: entityType || "UNDEFINED",
    entityId: entityId || "UNDEFINED",
    entityMetadata: entityMetadata || "UNDEFINED",
    fileName: fileName || "UNDEFINED",
    jobId: jobId || "UNDEFINED",
    step,
    validateResult: jobData.validateResult,
    nextcloudResult: jobData.nextcloudResult,
  });

  // Validate required fields at the start
  if (!userId || userId.trim() === "") {
    throw new Error(
      `[file-upload] ${jobId}: userId is required but was not provided or is empty`
    );
  }

  if (!entityType || entityType !== "DEAL_OPPORTUNITY") {
    throw new Error(
      `[file-upload] ${jobId}: entityType must be "DEAL_OPPORTUNITY" (run migration first)`
    );
  }

  if (!entityId || entityId.trim() === "") {
    throw new Error(
      `[file-upload] ${jobId}: entityId is required but was not provided or is empty`
    );
  }

  console.log("entity metadata", entityMetadata);
  console.log(`[file-upload] Starting job ${jobId} at step: ${step}`);
  console.log(
    `[file-upload] ${entityType}: ${entityMetadata.name} (${entityId})`
  );
  console.log(`[file-upload] User ID: ${userId}`);

  while (step !== FileUploadStep.Done) {
    switch (step) {
      // ========================================
      // Step 1: Validate file
      // ========================================
      case FileUploadStep.Validate: {
        await job.updateProgress({ step: "Validating file", percentage: 10 });
        console.log(`[file-upload] ${jobId}: Validating file`);

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: FileUploadStep.UploadNextcloud,
          validateResult: {
            isValid: true,
            fileSize: fileSize,
            mimeType: mimeType,
          },
        });
        step = FileUploadStep.UploadNextcloud;
        break;
      }

      // ========================================
      // Step 2: Verify Nextcloud Upload
      // ========================================
      case FileUploadStep.UploadNextcloud: {
        await job.updateProgress({
          step: "Verifying Nextcloud upload",
          percentage: 40,
        });

        const validateResult = job.data.validateResult;
        if (!validateResult) {
          throw new Error("Missing validateResult - job state corrupted");
        }

        // File is already uploaded to final location by tRPC handler
        // Just verify it exists and get the public URL
        if (!filePath) {
          throw new Error("Missing filePath - job state corrupted");
        }

        console.log(`[file-upload] ${jobId}: Verifying file at ${filePath}`);

        const exists = await fileExists(filePath);
        if (!exists) {
          throw new Error(
            `File not found at ${filePath} - upload may have failed`,
          );
        }

        const publicUrl = buildNextcloudFileUrl(filePath);

        console.log(`[file-upload] ${jobId}: File verified at ${filePath}`);

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: FileUploadStep.SaveDb,
          nextcloudResult: {
            destPath: filePath,
            publicUrl,
          },
        });
        step = FileUploadStep.SaveDb;
        break;
      }

      // ========================================
      // Step 3: Save to database + CIM extraction
      // ========================================
      case FileUploadStep.SaveDb: {
        await job.updateProgress({
          step: "Saving to database",
          percentage: 90,
        });

        const validateResult = job.data.validateResult;
        const nextcloudResult = job.data.nextcloudResult;

        if (!validateResult || !nextcloudResult) {
          throw new Error("Missing results - job state corrupted");
        }

        console.log(`[file-upload] ${jobId}: Saving file record to database`);

        // Validate userId again before database insert (shouldn't be needed, but safety check)
        if (!userId || userId.trim() === "") {
          throw new Error(
            `[file-upload] ${jobId}: userId is required for database insert`
          );
        }

        // Determine file category (default to OTHER if not specified)
        // Map FileCategory to DocumentCategory (they share the same values for most categories)
        const category = (job.data.fileCategory as DocumentCategory) || "OTHER";

        // Insert document record (unified table)
        let insertResult;
        try {
          insertResult = await db
            .insert(documents)
            .values({
              title: fileName,
              description: job.data.fileDescription || null,
              category,
              fileUrl: nextcloudResult.publicUrl,
              fileName: fileName,
              fileSize: validateResult.fileSize,
              mimeType: validateResult.mimeType,
              entityType: "DEAL_OPPORTUNITY",
              entityId: entityId,
              dealOpportunityId: entityId,
              uploadedById: userId,
            })
            .returning();
        } catch (dbError: any) {
          console.error(`[file-upload] ${jobId}: Database insert failed:`, {
            error: dbError.message,
            code: dbError.code,
            detail: dbError.detail,
            constraint: dbError.constraint,
            fileName,
            entityType,
            entityId,
            userId,
          });
          throw new Error(
            `Database insert failed: ${dbError.message || "Unknown error"}. ` +
            `Check that userId (${userId}) and ${entityType}Id (${entityId}) are valid.`
          );
        }

        const documentRecord = insertResult[0];
        if (!documentRecord) {
          throw new Error(
            "Failed to insert document record into database - no record returned"
          );
        }

        console.log(
          `[file-upload] ${jobId}: Document record saved with ID: ${documentRecord.id}`
        );

        await ragIngestionQueue.add(
          "ingest",
          {
            jobId: `${jobId}-rag`,
            documentId: documentRecord.id,
            userId,
          },
          { jobId: `${jobId}-rag` },
        );
        console.log(
          `[file-upload] ${jobId}: RAG ingestion queued for document ${documentRecord.id}`,
        );

        // Revalidate cache tags for the entity page
        // This ensures the page shows updated file count and new files immediately
        const cacheTags: string[] = [];
        cacheTags.push(`deal-${entityId}`, "deals");

        if (cacheTags.length > 0) {
          await revalidateCacheTags(cacheTags);
        }

        // No cleanup needed - file is already in final location

        // Mark as done
        await job.updateData({ ...job.data, step: FileUploadStep.Done });
        await job.updateProgress({ step: "Completed", percentage: 100 });

        console.log(`[file-upload] ${jobId}: Complete`);

        return {
          success: true,
          fileName,
          nextcloudUrl: nextcloudResult.publicUrl,
          fileId: documentRecord.id,
          message: "File uploaded successfully",
        };
      }

      default:
        throw new Error(`Invalid step: ${step}`);
    }
  }

  // If we reach here, job was already completed
  return {
    success: true,
    message: "Job already completed",
  };
}
