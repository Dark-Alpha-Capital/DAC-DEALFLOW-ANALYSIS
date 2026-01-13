import { Job } from "bullmq";
import { createClient } from "webdav";
import {
  COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME,
  googleGenAI,
} from "../lib/ai/available-models";
import { db } from "db";
import {
  files,
  documents,
  type FileCategory,
  type DocumentCategory,
  type EntityType,
} from "db/schema";

export enum FileUploadStep {
  Validate = "validate",
  UploadNextcloud = "upload-nextcloud",
  UploadGoogle = "upload-google",
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
  tempFilePath: string; // Path to temporary file in Nextcloud (much smaller than base64)
  fileSize: number; // File size in bytes
  mimeType: string; // MIME type of the file
  userId: string; // Required - user who uploaded the file
  // Entity context (polymorphic - supports both deals and companies)
  entityType: "DEAL" | "COMPANY";
  entityId: string; // References deals.id or companies.id
  entityMetadata: EntityMetadata;
  // Vector store embedding control
  embedInVectorStore?: boolean; // Default: true for companies, false for deals (but can be overridden)
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
  googleFileSearchResult?: {
    documentName: string | null;
  };
}

export interface FileUploadResult {
  success: boolean;
  fileName?: string;
  nextcloudUrl?: string;
  googleDocumentName?: string | null;
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
 * Create WebDAV client for Nextcloud
 */
function createNextcloudClient() {
  return createClient(
    `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}`,
    {
      username: process.env.NEXTCLOUD_USER,
      password: process.env.NEXTCLOUD_PASSWORD,
    }
  );
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
 * 2. UploadNextcloud - Upload to Nextcloud at /Diligence/{companyId}/{filename}
 * 3. UploadGoogle - Upload to Google File Search Store with metadata
 * 4. SaveDb - Save file record to files table
 * 5. Done - Complete
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
    tempFilePath,
    fileSize,
    mimeType,
    jobId,
    entityType,
    entityId,
    entityMetadata,
    userId,
    embedInVectorStore,
  } = jobData;

  let step = jobData.step ?? FileUploadStep.Validate;

  // Default embedInVectorStore: true for companies, false for deals (but can be overridden)
  const shouldEmbedInVectorStore =
    embedInVectorStore !== undefined
      ? embedInVectorStore
      : entityType === "COMPANY";

  console.log(`[file-upload] Extracted values:`, {
    userId: userId || "UNDEFINED",
    entityType: entityType || "UNDEFINED",
    entityId: entityId || "UNDEFINED",
    entityMetadata: entityMetadata || "UNDEFINED",
    fileName: fileName || "UNDEFINED",
    jobId: jobId || "UNDEFINED",
    embedInVectorStore: shouldEmbedInVectorStore,
    step,
    validateResult: jobData.validateResult,
    nextcloudResult: jobData.nextcloudResult,
    googleFileSearchResult: jobData.googleFileSearchResult,
  });

  // Validate required fields at the start
  if (!userId || userId.trim() === "") {
    throw new Error(
      `[file-upload] ${jobId}: userId is required but was not provided or is empty`
    );
  }

  if (!entityType || (entityType !== "DEAL" && entityType !== "COMPANY")) {
    throw new Error(
      `[file-upload] ${jobId}: entityType must be "DEAL" or "COMPANY"`
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
      // Step 2: Upload to Nextcloud
      // ========================================
      case FileUploadStep.UploadNextcloud: {
        await job.updateProgress({
          step: "Uploading to Nextcloud",
          percentage: 40,
        });

        const validateResult = job.data.validateResult;
        if (!validateResult) {
          throw new Error("Missing validateResult - job state corrupted");
        }

        // Create path based on entity type
        const destPath =
          entityType === "COMPANY"
            ? `Diligence/${entityId}/${fileName}`
            : `dealflow/raw-deals/${entityId}/${fileName}`;

        console.log(
          `[file-upload] ${jobId}: Uploading to Nextcloud at ${destPath}`
        );

        const client = createNextcloudClient();

        // Ensure the directory exists
        const dirPath =
          entityType === "COMPANY"
            ? `Diligence/${entityId}`
            : `dealflow/raw-deals/${entityId}`;
        try {
          await client.createDirectory(dirPath, { recursive: true });
        } catch (err) {
          // Directory might already exist, which is fine
          console.log(
            `[file-upload] ${jobId}: Directory ${dirPath} may already exist`
          );
        }

        // Read file from temp location and upload to final destination
        if (!tempFilePath) {
          throw new Error("Missing tempFilePath - job state corrupted");
        }

        const fileBuffer = await client.getFileContents(tempFilePath, {
          format: "binary",
        });
        await client.putFileContents(destPath, fileBuffer as Buffer);

        const publicUrl = `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}/${destPath}`;

        console.log(`[file-upload] ${jobId}: Nextcloud upload complete`);

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: FileUploadStep.UploadGoogle,
          nextcloudResult: {
            destPath,
            publicUrl,
          },
        });
        step = FileUploadStep.UploadGoogle;
        break;
      }

      // ========================================
      // Step 3: Upload to Google File Search Store
      // ========================================
      case FileUploadStep.UploadGoogle: {
        await job.updateProgress({
          step: "Uploading to Google File Search",
          percentage: 70,
        });

        const validateResult = job.data.validateResult;
        const nextcloudResult = job.data.nextcloudResult;
        if (!validateResult) {
          throw new Error("Missing validateResult - job state corrupted");
        }
        if (!nextcloudResult) {
          throw new Error("Missing nextcloudResult - job state corrupted");
        }

        let documentName: string | null = null;

        // Upload to Google File Search Store if configured and enabled
        if (
          shouldEmbedInVectorStore &&
          COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME
        ) {
          console.log(
            `[file-upload] ${jobId}: Uploading to Google File Search Store`
          );

          try {
            // Create custom metadata for the file (Google API expects array of key-value pairs)
            const customMetadata = [
              { key: "entityType", stringValue: entityType },
              { key: "entityId", stringValue: entityId },
              {
                key: entityType === "COMPANY" ? "companyName" : "dealName",
                stringValue: entityMetadata.name,
              },
              { key: "sector", stringValue: entityMetadata.sector ?? "" },
              { key: "stage", stringValue: entityMetadata.stage ?? "" },
              {
                key: "headquarters",
                stringValue: entityMetadata.headquarters ?? "",
              },
              { key: "revenue", numericValue: entityMetadata.revenue ?? 0 },
              { key: "ebitda", numericValue: entityMetadata.ebitda ?? 0 },
              { key: "uploadedAt", stringValue: new Date().toISOString() },
              { key: "fileName", stringValue: fileName },
            ];

            const nextcloudClient = createNextcloudClient();
            const fileBuffer = await nextcloudClient.getFileContents(
              nextcloudResult.destPath,
              {
                format: "binary",
              }
            );
            // getFileContents with format: "binary" returns a Buffer in Node.js
            // Buffer extends Uint8Array, so we can use it directly with Blob
            const fileBlob = new Blob([fileBuffer as Buffer], {
              type: mimeType,
            });

            console.log(`[file-upload] ${jobId}: Created Blob`, {
              size: fileBlob.size,
              type: fileBlob.type,
              fileName,
            });

            // Upload to Google File Search Store
            // Note: The API expects a Blob or File object, which we've created from the Buffer
            let operation =
              await googleGenAI.fileSearchStores.uploadToFileSearchStore({
                file: fileBlob,
                fileSearchStoreName: COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME,
                config: {
                  displayName: fileName,
                  customMetadata,
                },
              });

            console.log(`[file-upload] ${jobId}: Upload operation started`, {
              operationName: operation.name,
              done: operation.done,
            });

            // Wait for indexing to complete
            console.log(
              `[file-upload] ${jobId}: Waiting for Google indexing to complete...`
            );
            let waitCount = 0;
            while (!operation.done) {
              waitCount++;
              await new Promise((resolve) => setTimeout(resolve, 5000));
              operation = await googleGenAI.operations.get({ operation });
              if (waitCount % 3 === 0) {
                console.log(
                  `[file-upload] ${jobId}: Still waiting for indexing... (${waitCount * 5}s elapsed)`
                );
              }
            }

            console.log(`[file-upload] ${jobId}: Operation completed`, {
              operation: JSON.stringify(operation, null, 2),
            });

            // Extract document name from operation response
            // The response structure may vary, so check multiple possible paths
            documentName =
              (operation.response as any)?.documentName ||
              (operation.response as any)?.document?.name ||
              null;

            if (documentName) {
              console.log(
                `[file-upload] ${jobId}: Google upload complete - Document: ${documentName}`
              );
            } else {
              console.warn(
                `[file-upload] ${jobId}: Google upload completed but no document name returned`,
                {
                  operationResponse: operation.response,
                  operationKeys: operation.response
                    ? Object.keys(operation.response)
                    : [],
                }
              );
            }
          } catch (error) {
            console.error(
              `[file-upload] ${jobId}: Error uploading to Google File Search:`,
              error
            );
            // Don't fail the job - continue without Google indexing
          }
        } else {
          if (!shouldEmbedInVectorStore) {
            console.log(
              `[file-upload] ${jobId}: Skipping Google upload - vector store embedding disabled for ${entityType}`
            );
          } else {
            console.log(
              `[file-upload] ${jobId}: Skipping Google upload - store not configured`
            );
          }
        }

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: FileUploadStep.SaveDb,
          googleFileSearchResult: {
            documentName,
          },
        });
        step = FileUploadStep.SaveDb;
        break;
      }

      // ========================================
      // Step 4: Save to database
      // ========================================
      case FileUploadStep.SaveDb: {
        await job.updateProgress({
          step: "Saving to database",
          percentage: 90,
        });

        const validateResult = job.data.validateResult;
        const nextcloudResult = job.data.nextcloudResult;
        const googleResult = job.data.googleFileSearchResult;

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
              entityType: entityType as EntityType,
              entityId: entityId,
              uploadedById: userId,
              vectorStoreDocumentName: googleResult?.documentName || null,
              // Versioning defaults (can be updated later if needed)
              version: "1.0",
              isLatest: true,
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

        // Clean up temporary file (if it still exists)
        // Note: The temp file may have already been deleted or moved, so 404 is acceptable
        if (tempFilePath) {
          try {
            const client = createNextcloudClient();
            await client.deleteFile(tempFilePath);
            console.log(
              `[file-upload] ${jobId}: Deleted temp file: ${tempFilePath}`
            );
          } catch (cleanupError: any) {
            // 404 is acceptable - file may have already been deleted or moved
            if (cleanupError?.response?.status === 404) {
              console.log(
                `[file-upload] ${jobId}: Temp file already deleted or not found: ${tempFilePath}`
              );
            } else {
              // Log other errors but don't fail - temp file cleanup is best effort
              console.warn(
                `[file-upload] ${jobId}: Failed to delete temp file ${tempFilePath}:`,
                cleanupError
              );
            }
          }
        }

        // Mark as done
        await job.updateData({ ...job.data, step: FileUploadStep.Done });
        await job.updateProgress({ step: "Completed", percentage: 100 });

        console.log(`[file-upload] ${jobId}: Complete`);

        return {
          success: true,
          fileName,
          nextcloudUrl: nextcloudResult.publicUrl,
          googleDocumentName: googleResult?.documentName,
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
