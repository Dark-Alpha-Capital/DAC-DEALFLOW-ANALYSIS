import { Job } from "bullmq";
import { evaluateDealAndSaveResult } from "../lib/actions/evaluate-deal";
import type { JobProgressData } from "../lib/queues";

// Job data type
export interface ScreenDealJobData {
  jobId: string;
  dealId: string;
  screenerId: string;
  userId: string;
}

/**
 * Handler for screen-deal jobs
 * Evaluates a deal against a screener using AI
 */
export async function screenDealHandler(job: Job<ScreenDealJobData>) {
  const { dealId, screenerId, userId, jobId } = job.data;

  console.log(`[screen-deal-handler] Starting job ${job.id}`, {
    dealId,
    screenerId,
    userId,
    jobId,
  });

  try {
    // Progress callback that updates BullMQ job progress
    const onProgress = async (step: string, percentage: number) => {
      const progress: JobProgressData = { step, percentage };
      await job.updateProgress(progress);
      console.log(`[screen-deal-handler] Job ${job.id} progress:`, progress);
    };

    // Call the evaluation function with progress callback
    const result = await evaluateDealAndSaveResult(
      dealId,
      screenerId,
      onProgress
    );

    if (!result.success) {
      console.error(
        `[screen-deal-handler] Job ${job.id} failed:`,
        result.message
      );
      throw new Error(result.message || "Evaluation failed");
    }

    // Final progress update
    await job.updateProgress({ step: "Completed", percentage: 100 });

    console.log(`[screen-deal-handler] Job ${job.id} completed successfully`, {
      evaluationId: result.evaluationId,
    });

    return {
      success: true,
      evaluationId: result.evaluationId,
      data: result.data,
    };
  } catch (error) {
    console.error(`[screen-deal-handler] Job ${job.id} error:`, error);
    throw error;
  }
}
