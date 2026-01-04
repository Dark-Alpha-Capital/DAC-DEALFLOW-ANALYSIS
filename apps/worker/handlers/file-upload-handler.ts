import { Job } from "bullmq";
import type { JobProgressData } from "../lib/queues";

// Job data type
export interface FileUploadJobData {
  jobId: string;
  fileName: string;
  fileBuffer: string; // base64 encoded
  userId?: string;
}

// Upload steps for progress tracking
const uploadSteps = [
  { step: "Validating file", percentage: 10 },
  { step: "Compressing file", percentage: 30 },
  { step: "Uploading to storage", percentage: 60 },
  { step: "Generating metadata", percentage: 80 },
  { step: "Finalizing upload", percentage: 95 },
] as const;

/**
 * Handler for file-upload jobs
 * Processes file uploads with step-based progress tracking
 */
export async function fileUploadHandler(job: Job<FileUploadJobData>) {
  const { fileName, fileBuffer, jobId, userId } = job.data;

  console.log(`[file-upload-handler] Starting job ${job.id}`, {
    fileName,
    jobId,
    userId,
    fileSize: fileBuffer ? Buffer.from(fileBuffer, "base64").length : 0,
  });

  try {
    const buffer = Buffer.from(fileBuffer, "base64");
    const destFileName = `uploads/${Date.now()}-${fileName}`;

    console.log(`[file-upload-handler] Processing file`, {
      jobId: job.id,
      fileName,
      destFileName,
      bufferSize: buffer.length,
    });

    // Process file with step-based progress
    for (const { step, percentage } of uploadSteps) {
      const progress: JobProgressData = { step, percentage };
      await job.updateProgress(progress);

      console.log(`[file-upload-handler] Job ${job.id}: ${step}`, {
        percentage,
      });

      // Simulate processing time for each step
      const delays: Record<string, number> = {
        "Validating file": 200,
        "Compressing file": 500,
        "Uploading to storage": 800,
        "Generating metadata": 300,
        "Finalizing upload": 200,
      };
      await new Promise((resolve) => setTimeout(resolve, delays[step] || 100));
    }

    // Final progress
    await job.updateProgress({ step: "Completed", percentage: 100 });

    // TODO: Actual storage upload
    // await storage.bucket(BUCKET).file(destFileName).save(buffer);

    console.log(`[file-upload-handler] Job ${job.id} completed`, {
      fileName,
      destFileName,
    });

    return {
      success: true,
      fileName,
      destFileName,
      fileSize: buffer.length,
    };
  } catch (error) {
    console.error(`[file-upload-handler] Job ${job.id} error:`, error);
    throw error;
  }
}
