"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export type JobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused";

export interface JobProgressData {
  step: string;
  percentage: number;
}

export interface JobProgress {
  jobId: string;
  state: JobState;
  progress: JobProgressData;
  queueType?: string;
  result?: any;
  error?: string;
  attemptsMade?: number;
  timestamp?: number;
}

interface UseJobProgressOptions {
  onComplete?: (result: any) => void;
  onFailed?: (error: string) => void;
  onProgress?: (progress: JobProgressData) => void;
}

export function useJobProgress(
  jobId: string | null,
  options?: UseJobProgressOptions
) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(
    (id: string) => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setError(null);
      setIsConnected(false);

      const eventSource = new EventSource(`/api/jobs/${id}/progress`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log(`[useJobProgress] Connected to job ${id}`);
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[useJobProgress] Event:`, data);

          switch (data.type) {
            case "connected":
              setIsConnected(true);
              break;

            case "progress":
              setProgress({
                jobId: data.jobId,
                state: data.state,
                progress: data.progress,
                queueType: data.queueType,
                attemptsMade: data.attemptsMade,
                timestamp: data.timestamp,
              });
              options?.onProgress?.(data.progress);
              break;

            case "completed":
              setProgress({
                jobId: data.jobId,
                state: "completed",
                progress: { step: "Completed", percentage: 100 },
                queueType: data.queueType,
                result: data.result,
                timestamp: data.timestamp,
              });
              options?.onComplete?.(data.result);
              break;

            case "failed":
              setProgress({
                jobId: data.jobId,
                state: "failed",
                progress: { step: "Failed", percentage: 0 },
                queueType: data.queueType,
                error: data.error,
                timestamp: data.timestamp,
              });
              options?.onFailed?.(data.error);
              break;

            case "waiting":
              setProgress({
                jobId: data.jobId,
                state: "waiting",
                progress: { step: "Waiting", percentage: 0 },
                timestamp: data.timestamp,
              });
              break;

            case "error":
              setError(data.error);
              break;
          }
        } catch (err) {
          console.error("[useJobProgress] Error parsing event:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("[useJobProgress] EventSource error:", err);
        setIsConnected(false);

        // If the connection is closed (readyState === 2), don't reconnect
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("[useJobProgress] Connection closed");
        }
      };

      return eventSource;
    },
    [options]
  );

  useEffect(() => {
    if (!jobId) {
      // Reset state when no jobId
      setProgress(null);
      setIsConnected(false);
      setError(null);
      return;
    }

    const eventSource = connect(jobId);

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [jobId, connect]);

  // Disconnect function for manual cleanup
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return {
    progress,
    isConnected,
    error,
    disconnect,
    // Convenience getters
    isComplete: progress?.state === "completed",
    isFailed: progress?.state === "failed",
    isProcessing: progress?.state === "active",
    isWaiting: progress?.state === "waiting",
    step: progress?.progress?.step || null,
    percentage: progress?.progress?.percentage ?? 0,
  };
}

// Hook for tracking multiple jobs
export function useMultiJobProgress(jobIds: string[]) {
  const [progressMap, setProgressMap] = useState<Map<string, JobProgress>>(
    new Map()
  );
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  useEffect(() => {
    // Close connections for removed jobIds
    eventSourcesRef.current.forEach((eventSource, id) => {
      if (!jobIds.includes(id)) {
        eventSource.close();
        eventSourcesRef.current.delete(id);
      }
    });

    // Create connections for new jobIds
    jobIds.forEach((jobId) => {
      if (!eventSourcesRef.current.has(jobId)) {
        const eventSource = new EventSource(`/api/jobs/${jobId}/progress`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "progress" || data.type === "completed" || data.type === "failed") {
              setProgressMap((prev) => {
                const updated = new Map(prev);
                updated.set(jobId, {
                  jobId: data.jobId,
                  state: data.state || data.type,
                  progress: data.progress || { step: data.type, percentage: data.type === "completed" ? 100 : 0 },
                  queueType: data.queueType,
                  result: data.result,
                  error: data.error,
                  timestamp: data.timestamp,
                });
                return updated;
              });
            }
          } catch (err) {
            console.error("[useMultiJobProgress] Error parsing event:", err);
          }
        };

        eventSourcesRef.current.set(jobId, eventSource);
      }
    });

    return () => {
      // Cleanup all connections on unmount
      eventSourcesRef.current.forEach((eventSource) => {
        eventSource.close();
      });
      eventSourcesRef.current.clear();
    };
  }, [jobIds.join(",")]); // Re-run when jobIds array changes

  const getProgress = useCallback(
    (jobId: string) => progressMap.get(jobId) || null,
    [progressMap]
  );

  const allJobs = Array.from(progressMap.values());
  const completedJobs = allJobs.filter((j) => j.state === "completed");
  const failedJobs = allJobs.filter((j) => j.state === "failed");
  const activeJobs = allJobs.filter((j) => j.state === "active");
  const waitingJobs = allJobs.filter((j) => j.state === "waiting");

  return {
    progressMap,
    getProgress,
    allJobs,
    completedJobs,
    failedJobs,
    activeJobs,
    waitingJobs,
    isAllComplete: allJobs.length > 0 && allJobs.every((j) => j.state === "completed" || j.state === "failed"),
  };
}
