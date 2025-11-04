import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Configure multer to store files in memory by default.
// Swap to disk storage if needed in the future.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Publish progress update to Redis
 * @param channel - Redis channel (e.g., "file-upload", "bulk-upload")
 * @param jobId - Unique job identifier
 * @param data - Progress data
 */
async function publishProgress(
  channel: string,
  jobId: string,
  data: Record<string, any>
) {
  const payload = {
    jobId,
    timestamp: Date.now(),
    ...data,
  };

  await redis.publish(channel, JSON.stringify(payload));
  console.log(`📡 Published to ${channel}:`, payload);
}

router.post(
  "/file-upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const file = req.file;
    const { userId, userEmail } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const jobId = uuidv4();

    try {
      // Send initial response with jobId
      res.status(202).json({
        jobId,
        message: "File upload started",
        fileName: file.originalname,
        fileSize: file.size,
      });

      // Publish initial progress
      await publishProgress("file-upload", jobId, {
        status: "processing",
        progress: 0,
        fileName: file.originalname,
        fileSize: file.size,
        userId,
        userEmail,
      });

      // Simulate file processing (replace with actual logic)
      for (let i = 1; i <= 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        await publishProgress("file-upload", jobId, {
          status: "processing",
          progress: i * 10,
          fileName: file.originalname,
          message: `Processing chunk ${i}/10...`,
        });
      }

      // Final completion
      await publishProgress("file-upload", jobId, {
        status: "completed",
        progress: 100,
        fileName: file.originalname,
        message: "File processing completed",
      });

      console.log(`✅ File upload completed: ${jobId}`);
    } catch (error) {
      console.error(`❌ File upload error for ${jobId}:`, error);

      await publishProgress("file-upload", jobId, {
        status: "failed",
        progress: 0,
        fileName: file.originalname,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
