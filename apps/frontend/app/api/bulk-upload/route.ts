// app/api/bulk-upload/route.ts
import { NextRequest } from "next/server";
import { fileUploadQueue, type FileUploadJobData } from "@/lib/queue-client";
import { randomUUID } from "crypto";
import { redisClient } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return new Response(JSON.stringify({ error: "No files uploaded" }), {
        status: 400,
      });
    }

    // Create a unique job for each file
    const jobs = files.map((file) => ({
      jobId: randomUUID(),
      fileName: file.name,
    }));

    // Seed Redis so clients can track status immediately
    await Promise.allSettled(
      jobs.map(async ({ jobId, fileName }) => {
        await redisClient.hSet(`job:${jobId}`, {
          status: "queued",
          fileName: fileName,
          createdAt: Date.now().toString(),
        });
        await redisClient.expire(`job:${jobId}`, 3600 * 24);
      }),
    );

    // Add jobs to BullMQ queue
    const jobPromises = jobs.map(async ({ jobId }, index) => {
      const file = files[index]!;
      console.log(`[bulk-upload] Queueing job`, {
        jobId,
        index,
        name: file.name,
        size: file.size,
      });

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const jobData: FileUploadJobData = {
        jobId,
        fileName: file.name,
        fileBuffer: buffer.toString("base64"),
      };

      const job = await fileUploadQueue.add("upload", jobData, {
        jobId, // Use our own jobId for easier tracking
      });

      console.log(`[bulk-upload] Added job ${job.id}`, {
        fileName: file.name,
      });

      return { jobId, fileName: file.name, bullmqJobId: job.id };
    });

    await Promise.all(jobPromises);
    console.log(`[bulk-upload] All ${jobs.length} jobs added to BullMQ queue`);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Bulk upload queued",
        jobs: jobs.map((j) => ({ jobId: j.jobId, fileName: j.fileName })),
      }),
      { status: 202 },
    );
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
    });
  }
}
