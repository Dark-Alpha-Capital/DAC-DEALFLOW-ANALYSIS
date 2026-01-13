"use client";

import { useEffect, useRef } from "react";
import { useJob } from "./use-jobs";
import type { JobWithMetadata } from "@/lib/queue-types";

interface UseJobPollingOptions {
  enabled?: boolean;
  interval?: number;
  onUpdate?: (job: JobWithMetadata | null) => void;
}

/**
 * Hook for polling a single job with optimized intervals based on job state
 * - Active jobs: poll every 1-2 seconds
 * - Completed/Failed jobs: poll every 10 seconds
 * - Stops polling after job completes for 5 minutes
 */
export function useJobPolling(
  jobId: string | null,
  queueName: string | null,
  options: UseJobPollingOptions = {}
) {
  const { enabled = true, interval, onUpdate } = options;
  const { job, refetch } = useJob(jobId, queueName);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const completedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !jobId || !queueName) {
      return;
    }

    // Determine polling interval based on job state
    const getInterval = (): number => {
      if (interval) return interval;

      if (!job) return 2000; // Default 2s if job not loaded yet

      switch (job.state) {
        case "active":
        case "waiting":
          return 2000; // 2 seconds for active jobs
        case "completed":
        case "failed":
          // If job completed more than 5 minutes ago, stop polling
          if (completedAtRef.current) {
            const timeSinceCompletion = Date.now() - completedAtRef.current;
            if (timeSinceCompletion > 5 * 60 * 1000) {
              return 0; // Stop polling
            }
          }
          return 10000; // 10 seconds for completed jobs
        default:
          return 5000; // 5 seconds default
      }
    };

    // Track when job completes
    if (job?.state === "completed" || job?.state === "failed") {
      if (!completedAtRef.current) {
        completedAtRef.current = Date.now();
      }
    } else {
      completedAtRef.current = null;
    }

    // Call onUpdate callback
    if (onUpdate && job) {
      onUpdate(job);
    }

    const pollInterval = getInterval();

    // Don't set up polling if interval is 0 (stop polling)
    if (pollInterval === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up polling
    intervalRef.current = setInterval(() => {
      refetch();
    }, pollInterval);

    // Initial fetch
    refetch();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, queueName, enabled, job?.state, interval, refetch, onUpdate]);

  return {
    job,
    refetch,
  };
}
