import { screenDealQueue, type ScreenDealJobData } from "@/lib/queue-client";
import { getSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { redisClient } from "@/lib/redis";

export async function POST(request: Request) {
  const userSession = await getSession();

  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { payload } = await request.json();
    console.log("payload", payload);

    // Create individual jobs for each deal ID
    const jobPromises = payload.dealIds.map(async (dealId: string) => {
      const jobId = crypto.randomUUID();

      // Store job info in Redis for tracking (optional, BullMQ tracks this too)
      try {
        await redisClient.hSet(`job:${jobId}`, {
          status: "queued",
          userId: userSession.user.id as string,
          dealId: dealId,
          screenerId: payload.screenerId,
          createdAt: Date.now().toString(),
        });
        await redisClient.expire(`job:${jobId}`, 3600 * 24);
      } catch (redisError) {
        console.error(`Redis operation failed for job ${jobId}:`, redisError);
        // Continue even if Redis fails - BullMQ will track the job
      }

      // Add job to BullMQ queue
      const jobData: ScreenDealJobData = {
        jobId,
        userId: userSession.user.id as string,
        dealId,
        screenerId: payload.screenerId,
      };

      const job = await screenDealQueue.add("screen", jobData, {
        jobId, // Use our own jobId for easier tracking
      });

      console.log(`Added job ${job.id} for deal ${dealId}`);
      return { jobId, dealId, bullmqJobId: job.id };
    });

    // Wait for all jobs to be added
    const results = await Promise.all(jobPromises);
    console.log(`Successfully added ${results.length} jobs to BullMQ queue`);

    return new Response(
      JSON.stringify({
        ok: true,
        jobs: results.map((r) => ({ jobId: r.jobId, dealId: r.dealId })),
      }),
    );
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
    });
  }
}
