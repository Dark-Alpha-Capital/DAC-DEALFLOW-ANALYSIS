import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";

import { redisClient } from "../lib/redis";

const router = Router();

// Configure multer to store files in memory by default.
// Swap to disk storage if needed in the future.
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/file-upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      console.log(`[file-upload-worker] Received request`, {
        timestamp: new Date().toISOString(),
        bodyKeys: Object.keys(req.body),
      });

      const msg = req.body.message;
      const data = JSON.parse(Buffer.from(msg.data, "base64").toString());

      const { jobId, fileName, fileBuffer } = data;

      console.log(`[file-upload-worker] Processing job`, {
        jobId,
        fileName,
        fileSize: fileBuffer ? Buffer.from(fileBuffer, "base64").length : 0,
        timestamp: new Date().toISOString(),
      });

      // Update job status to processing
      if (!redisClient) {
        return res.status(503).json({ error: "Redis client not available" });
      }
      await redisClient.hSet(`job:${jobId}`, "status", "processing");
      console.log(`[file-upload-worker] Updated job status to processing`, {
        jobId,
      });

      const buffer = Buffer.from(fileBuffer, "base64");
      const destFileName = `uploads/${Date.now()}-${fileName}`;

      console.log(`[file-upload-worker] Starting file upload simulation`, {
        jobId,
        fileName,
        destFileName,
        bufferSize: buffer.length,
      });

      // Simulate file upload processing with realistic delays
      const uploadSteps = [
        { step: "Validating file", delay: 200 },
        { step: "Compressing file", delay: 500 },
        { step: "Uploading to storage", delay: 800 },
        { step: "Generating metadata", delay: 300 },
        { step: "Finalizing upload", delay: 200 },
      ];

      for (const { step, delay } of uploadSteps) {
        console.log(`[file-upload-worker] ${step}`, {
          jobId,
          fileName,
          step,
          delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      console.log(`[file-upload-worker] File upload simulation completed`, {
        jobId,
        fileName,
        destFileName,
        totalProcessingTime: uploadSteps.reduce((sum, s) => sum + s.delay, 0),
      });

      // Simulate actual storage upload (commented out for testing)
      // await storage.bucket(BUCKET).file(destFileName).save(buffer);

      // Update job progress
      if (!redisClient) {
        return res.status(503).json({ error: "Redis client not available" });
      }

      const processed = await redisClient.hIncrBy(
        `job:${jobId}`,
        "processed",
        1
      );
      const total = await redisClient.hGet(`job:${jobId}`, "totalFiles");

      console.log(`[file-upload-worker] Updated job progress`, {
        jobId,
        fileName,
        processed,
        total,
        isComplete: processed === Number(total),
      });

      // Publish progress update
      const progressData = {
        jobId,
        status: processed === Number(total) ? "done" : "processing",
        processed,
        total,
        fileName,
        timestamp: new Date().toISOString(),
      };

      await redisClient.publish(`job:${jobId}`, JSON.stringify(progressData));
      console.log(
        `[file-upload-worker] Published progress update`,
        progressData
      );

      // Mark job as complete if all files processed
      if (processed === Number(total)) {
        await redisClient.hSet(`job:${jobId}`, "status", "done");
        console.log(`[file-upload-worker] Job completed`, {
          jobId,
          totalFiles: total,
          finalStatus: "done",
        });
      }

      console.log(`[file-upload-worker] Request completed successfully`, {
        jobId,
        fileName,
        status: "success",
      });

      res.status(204).send();
    } catch (error) {
      console.error(`[file-upload-worker] Error processing file upload`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
