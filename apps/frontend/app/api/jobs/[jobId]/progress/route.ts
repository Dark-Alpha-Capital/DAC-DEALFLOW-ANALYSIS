import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  screenDealQueue,
  fileUploadQueue,
  type JobProgressData,
} from "@/lib/queue-client";

// SSE endpoint for streaming job progress updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  // Optional: Check authentication
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch (error) {
          // Controller might be closed
          console.error("[SSE] Error sending event:", error);
        }
      };

      // Send initial connection message
      sendEvent({ type: "connected", jobId });

      let isActive = true;
      let retryCount = 0;
      const maxRetries = 120; // 60 seconds at 500ms intervals

      const checkJob = async () => {
        if (!isActive) return;

        try {
          // Try both queues since we might not know which one the job is in
          let job = await screenDealQueue.getJob(jobId);
          let queueType = "screen-deal";

          if (!job) {
            job = await fileUploadQueue.getJob(jobId);
            queueType = "file-upload";
          }

          if (job) {
            const state = await job.getState();
            const progress = job.progress as JobProgressData | undefined;

            sendEvent({
              type: "progress",
              jobId,
              queueType,
              state,
              progress: progress || { step: "Queued", percentage: 0 },
              attemptsMade: job.attemptsMade,
              timestamp: Date.now(),
            });

            // If job is completed or failed, send final update and close
            if (state === "completed") {
              sendEvent({
                type: "completed",
                jobId,
                queueType,
                result: job.returnvalue,
                timestamp: Date.now(),
              });
              isActive = false;
              controller.close();
              return;
            }

            if (state === "failed") {
              sendEvent({
                type: "failed",
                jobId,
                queueType,
                error: job.failedReason,
                timestamp: Date.now(),
              });
              isActive = false;
              controller.close();
              return;
            }
          } else {
            retryCount++;
            if (retryCount >= maxRetries) {
              sendEvent({
                type: "error",
                jobId,
                error: "Job not found or expired",
                timestamp: Date.now(),
              });
              isActive = false;
              controller.close();
              return;
            }

            // Job might not be added yet, send waiting status
            sendEvent({
              type: "waiting",
              jobId,
              message: "Waiting for job to be queued...",
              timestamp: Date.now(),
            });
          }

          // Continue polling if still active
          if (isActive) {
            setTimeout(checkJob, 500); // Poll every 500ms
          }
        } catch (error) {
          console.error("[SSE] Error checking job:", error);
          sendEvent({
            type: "error",
            jobId,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now(),
          });
          isActive = false;
          controller.close();
        }
      };

      // Start polling
      checkJob();

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isActive = false;
        console.log(`[SSE] Client disconnected for job ${jobId}`);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering for nginx
    },
  });
}
