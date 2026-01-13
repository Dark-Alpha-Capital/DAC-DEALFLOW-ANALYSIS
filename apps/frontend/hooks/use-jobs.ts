"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import type { JobWithMetadata } from "@/lib/queue-types";

/**
 * Hook for fetching and managing all user jobs
 * Uses tRPC with React Query for caching and auto-refresh
 */
export function useJobs() {
  const trpc = useTRPC();

  const {
    data: jobs = [],
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.jobs.getAll.queryOptions());

  return {
    jobs,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching latest N jobs (optimized for sidebar)
 */
export function useLatestJobs(limit: number = 5) {
  const trpc = useTRPC();

  const {
    data: jobs = [],
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.jobs.getLatest.queryOptions({ limit }));

  return {
    jobs,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching a single job by ID
 */
export function useJob(jobId: string | null, queueName: string | null) {
  const trpc = useTRPC();

  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...trpc.jobs.getById.queryOptions({
      jobId: jobId!,
      queueName: queueName! as any,
    }),
    enabled: !!jobId && !!queueName,
  });

  return {
    job,
    isLoading,
    error,
    refetch,
  };
}
