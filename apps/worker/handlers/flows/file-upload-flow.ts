import { Job, FlowJob } from "bullmq";
import { QUEUE_NAMES } from "../../lib/queues";
import { FLOW_QUEUE_NAMES, FLOW_DEFAULT_JOB_OPTIONS, FLOW_STEP_COUNTS } from "../../lib/flow-queues";
import {
  generateIdempotencyKey,
  withIdempotency,
} from "../../lib/idempotency";

// ============================================================================
// Types
// ============================================================================

export interface FileUploadFlowData {
  jobId: string;
  fileName: string;
  fileBuffer: string; // base64 encoded
  userId?: string;
}

export interface ValidateResult {
  isValid: boolean;
  fileSize: number;
  mimeType: string;
  originalBuffer: string;
}

export interface CompressResult {
  compressedBuffer: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface UploadResult {
  success: boolean;
  destFileName: string;
  publicUrl?: string;
  alreadyUploaded?: boolean;
}

export interface FileUploadFinalizeResult {
  success: boolean;
  fileName: string;
  destFileName: string;
  fileSize: number;
  publicUrl?: string;
}

export interface FileUploadFlowResult {
  success: boolean;
  fileName?: string;
  destFileName?: string;
  fileSize?: number;
  publicUrl?: string;
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
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================================================
// Child Handlers
// ============================================================================

/**
 * Validate Handler
 * Validates file type, size, and format.
 * This is the first step in the flow.
 */
export async function validateHandler(job: Job<FileUploadFlowData>): Promise<ValidateResult> {
  const { fileName, fileBuffer, jobId } = job.data;

  console.log(`[validate] Starting for job ${jobId}`, { fileName });

  const idempotencyKey = generateIdempotencyKey("file-upload:validate", {
    jobId,
    fileName,
  });

  const { result, fromCache } = await withIdempotency<ValidateResult>(
    idempotencyKey,
    async () => {
      const buffer = Buffer.from(fileBuffer, "base64");
      const fileSize = buffer.length;

      // Validate file size
      if (fileSize > MAX_FILE_SIZE) {
        throw new Error(`File size ${fileSize} exceeds maximum allowed size ${MAX_FILE_SIZE}`);
      }

      if (fileSize === 0) {
        throw new Error("File is empty");
      }

      // Detect MIME type from extension (simplified)
      const extension = fileName.split(".").pop()?.toLowerCase() || "";
      const mimeTypeMap: Record<string, string> = {
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
      };

      const mimeType = mimeTypeMap[extension] || "application/octet-stream";

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        console.warn(`[validate] Unrecognized MIME type: ${mimeType}, proceeding anyway`);
      }

      return {
        isValid: true,
        fileSize,
        mimeType,
        originalBuffer: fileBuffer,
      };
    }
  );

  if (fromCache) {
    console.log(`[validate] Returning cached result for job ${jobId}`);
  }

  console.log(`[validate] Completed for job ${jobId}`, {
    fileSize: result.fileSize,
    mimeType: result.mimeType,
    fromCache,
  });

  return result;
}

/**
 * Compress Handler
 * Compresses the file if beneficial.
 * Depends on validate result via getChildrenValues().
 */
export async function compressHandler(job: Job<FileUploadFlowData>): Promise<CompressResult> {
  const { fileName, jobId } = job.data;

  console.log(`[compress] Starting for job ${jobId}`);

  // Get the validate result from child job
  const childrenValues = await job.getChildrenValues<ValidateResult>();
  const validateResult = Object.values(childrenValues)[0];

  if (!validateResult) {
    throw new Error("No validate result found");
  }

  const idempotencyKey = generateIdempotencyKey("file-upload:compress", {
    jobId,
    fileName,
    size: validateResult.fileSize.toString(),
  });

  const { result, fromCache } = await withIdempotency<CompressResult>(
    idempotencyKey,
    async () => {
      const { originalBuffer, fileSize, mimeType } = validateResult;

      // For now, skip actual compression for non-image files
      // In a real implementation, you might use sharp for images, pdfkit for PDFs, etc.
      const isCompressible = mimeType.startsWith("image/") && mimeType !== "image/gif";

      if (!isCompressible) {
        console.log(`[compress] Skipping compression for ${mimeType}`);
        return {
          compressedBuffer: originalBuffer,
          originalSize: fileSize,
          compressedSize: fileSize,
          compressionRatio: 1,
        };
      }

      // Simulate compression (in production, use sharp or similar)
      // For now, just pass through the original buffer
      console.log(`[compress] Would compress ${mimeType} file (${fileSize} bytes)`);

      return {
        compressedBuffer: originalBuffer,
        originalSize: fileSize,
        compressedSize: fileSize,
        compressionRatio: 1,
      };
    }
  );

  if (fromCache) {
    console.log(`[compress] Returning cached result for job ${jobId}`);
  }

  await updateParentProgress(job, "Compressing file", 30);

  console.log(`[compress] Completed for job ${jobId}`, {
    compressionRatio: result.compressionRatio,
    fromCache,
  });

  return result;
}

/**
 * Upload Handler
 * Uploads the file to Google Cloud Storage.
 * Depends on compress result via getChildrenValues().
 */
export async function uploadHandler(job: Job<FileUploadFlowData>): Promise<UploadResult> {
  const { fileName, jobId } = job.data;

  console.log(`[upload] Starting for job ${jobId}`);

  await updateParentProgress(job, "Uploading to storage", 60);

  // Get the compress result from child job
  const childrenValues = await job.getChildrenValues<CompressResult>();
  const compressResult = Object.values(childrenValues)[0];

  if (!compressResult) {
    throw new Error("No compress result found");
  }

  const destFileName = `uploads/${Date.now()}-${fileName}`;

  const idempotencyKey = generateIdempotencyKey("file-upload:upload", {
    jobId,
    destFileName,
  });

  const { result, fromCache } = await withIdempotency<UploadResult>(
    idempotencyKey,
    async () => {
      const { compressedBuffer } = compressResult;
      const buffer = Buffer.from(compressedBuffer, "base64");

      // TODO: Implement actual GCS upload
      // const bucket = storage.bucket(process.env.GCLOUD_BUCKET!);
      // const file = bucket.file(destFileName);
      //
      // // Check if file already exists (idempotency)
      // const [exists] = await file.exists();
      // if (exists) {
      //   const [metadata] = await file.getMetadata();
      //   return {
      //     success: true,
      //     destFileName,
      //     publicUrl: metadata.publicUrl,
      //     alreadyUploaded: true,
      //   };
      // }
      //
      // await file.save(buffer, {
      //   contentType: validateResult.mimeType,
      //   resumable: false,
      // });
      //
      // const [metadata] = await file.getMetadata();

      // Simulate upload for now
      console.log(`[upload] Would upload ${buffer.length} bytes to ${destFileName}`);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate upload time

      return {
        success: true,
        destFileName,
        publicUrl: `https://storage.googleapis.com/bucket/${destFileName}`,
      };
    }
  );

  if (fromCache) {
    console.log(`[upload] Returning cached result for job ${jobId}`);
  }

  console.log(`[upload] Completed for job ${jobId}`, {
    destFileName: result.destFileName,
    alreadyUploaded: result.alreadyUploaded,
    fromCache,
  });

  return result;
}

/**
 * Finalize Handler
 * Generates metadata and updates the database.
 * Depends on upload result via getChildrenValues().
 */
export async function fileUploadFinalizeHandler(job: Job<FileUploadFlowData>): Promise<FileUploadFinalizeResult> {
  const { fileName, jobId } = job.data;

  console.log(`[finalize] Starting for job ${jobId}`);

  await updateParentProgress(job, "Generating metadata", 80);

  // Get the upload result from child job
  const childrenValues = await job.getChildrenValues<UploadResult>();
  const uploadResult = Object.values(childrenValues)[0];

  if (!uploadResult) {
    throw new Error("No upload result found");
  }

  // We also need to get the validate result for file size
  // In BullMQ flows, we can access grandchild results through the parent chain
  // For simplicity, we'll re-decode the buffer size from compress result

  const allChildren = await job.getChildrenValues();
  let fileSize = 0;

  // Find the compress result to get file size
  for (const value of Object.values(allChildren)) {
    if (value && typeof value === "object" && "compressedSize" in value) {
      fileSize = (value as CompressResult).compressedSize;
      break;
    }
  }

  await updateParentProgress(job, "Finalizing upload", 95);

  // TODO: Update database with file metadata
  // await db.insert(files).values({
  //   fileName,
  //   destFileName: uploadResult.destFileName,
  //   fileSize,
  //   publicUrl: uploadResult.publicUrl,
  //   uploadedBy: job.data.userId,
  //   uploadedAt: new Date(),
  // });

  console.log(`[finalize] Would save metadata to database`, {
    fileName,
    destFileName: uploadResult.destFileName,
    fileSize,
  });

  await updateParentProgress(job, "Completed", 100);

  console.log(`[finalize] Completed for job ${jobId}`, {
    destFileName: uploadResult.destFileName,
  });

  return {
    success: true,
    fileName,
    destFileName: uploadResult.destFileName,
    fileSize,
    publicUrl: uploadResult.publicUrl,
  };
}

/**
 * Parent Handler
 * Called after all children complete. Aggregates results.
 */
export async function fileUploadParentHandler(job: Job<FileUploadFlowData>): Promise<FileUploadFlowResult> {
  const { jobId } = job.data;

  console.log(`[file-upload-parent] Processing parent job ${jobId}`);

  // Get all children values
  const childrenValues = await job.getChildrenValues<FileUploadFinalizeResult>();
  const finalizeResult = Object.values(childrenValues)[0];

  if (!finalizeResult) {
    console.error(`[file-upload-parent] No finalize result found for job ${jobId}`);
    return {
      success: false,
      message: "Flow completed but no results found",
    };
  }

  console.log(`[file-upload-parent] Flow completed for job ${jobId}`, {
    destFileName: finalizeResult.destFileName,
  });

  return {
    success: true,
    fileName: finalizeResult.fileName,
    destFileName: finalizeResult.destFileName,
    fileSize: finalizeResult.fileSize,
    publicUrl: finalizeResult.publicUrl,
    message: "File uploaded successfully",
  };
}

// ============================================================================
// Flow Builder
// ============================================================================

/**
 * Builds the file-upload flow structure.
 *
 * Flow execution order (BullMQ processes children first, bottom-up):
 * 1. validate (leaf child, runs first)
 * 2. compress (depends on validate)
 * 3. upload (depends on compress)
 * 4. finalize (depends on upload)
 * 5. file-upload (parent, runs last)
 */
export function buildFileUploadFlow(data: FileUploadFlowData): FlowJob {
  return {
    name: "file-upload",
    queueName: QUEUE_NAMES.FILE_UPLOAD,
    data,
    opts: {
      ...FLOW_DEFAULT_JOB_OPTIONS,
      jobId: data.jobId,
    },
    children: [
      {
        name: "finalize",
        queueName: FLOW_QUEUE_NAMES.FILE_UPLOAD_FINALIZE,
        data,
        opts: FLOW_DEFAULT_JOB_OPTIONS,
        children: [
          {
            name: "upload",
            queueName: FLOW_QUEUE_NAMES.FILE_UPLOAD_UPLOAD,
            data,
            opts: FLOW_DEFAULT_JOB_OPTIONS,
            children: [
              {
                name: "compress",
                queueName: FLOW_QUEUE_NAMES.FILE_UPLOAD_COMPRESS,
                data,
                opts: FLOW_DEFAULT_JOB_OPTIONS,
                children: [
                  {
                    name: "validate",
                    queueName: FLOW_QUEUE_NAMES.FILE_UPLOAD_VALIDATE,
                    data,
                    opts: FLOW_DEFAULT_JOB_OPTIONS,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Updates the parent job's progress.
 */
async function updateParentProgress(
  job: Job,
  step: string,
  percentage: number
): Promise<void> {
  try {
    await job.updateProgress({ step, percentage });
  } catch (error) {
    console.error("[updateParentProgress] Error:", error);
  }
}
