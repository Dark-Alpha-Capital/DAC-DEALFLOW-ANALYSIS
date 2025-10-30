import { pubSubClient } from "@/lib/pubsub-client";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { redisClient } from "@/lib/redis";
import crypto from "crypto";

export async function POST(request: Request) {
  const userSession = await auth();

  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { payload } = await request.json();
    console.log("payload", payload);

    const topicName = `projects/${process.env.GCLOUD_PROJECT_ID}/topics/screen-deal`;

    // Create individual jobs for each deal ID
    const publishPromises = payload.dealIds.map(async (dealId: string) => {
      const jobId = crypto.randomUUID();

      // Store individual job in Redis with error handling
      try {
        await redisClient.hset(`job:${jobId}`, {
          status: "queued",
          userId: userSession.user.id,
          dealId: dealId,
          screenerId: payload.screenerId,
          createdAt: Date.now().toString(),
        });
        await redisClient.expire(`job:${jobId}`, 3600 * 24);
      } catch (redisError) {
        console.error(`Redis operation failed for job ${jobId}:`, redisError);
        throw new Error(`Failed to store job information for deal ${dealId}`);
      }

      const dataBuffer = Buffer.from(
        JSON.stringify({
          jobId: jobId,
          userId: userSession.user.id,
          dealId: dealId,
          screenerId: payload.screenerId,
          jobType: "screen-deal",
        }),
      );

      const messageId = await pubSubClient
        .topic(topicName)
        .publishMessage({ data: dataBuffer });

      console.log(
        `Published message for deal ${dealId} with job ${jobId}:`,
        messageId,
      );
      return { jobId, dealId, messageId };
    });

    // Wait for all messages to be published
    const results = await Promise.all(publishPromises);
    console.log(`Successfully published ${results.length} messages to pubsub`);

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
