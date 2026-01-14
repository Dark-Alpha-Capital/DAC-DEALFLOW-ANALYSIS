"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { JobProgressCard } from "@/components/job-progress-card";
import { useLatestJobs } from "@/hooks/use-jobs";
import { useJobPolling } from "@/hooks/use-job-polling";
import { Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function JobTrackerSidebar() {
  const { jobs, isLoading, refetch } = useLatestJobs(5);
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  // Poll for updates on active jobs
  const activeJobs = jobs.filter(
    (job) => job.state === "active" || job.state === "waiting",
  );

  // Refetch every 2 seconds if there are active jobs
  useEffect(() => {
    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      refetch();
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobs.length, refetch]);

  // Listen for newJobs event and invalidate cache
  useEffect(() => {
    const handleNewJobs = () => {
      // Invalidate React Query cache for latest jobs
      queryClient.invalidateQueries({
        queryKey: trpc.jobs.getLatest.queryKey({ limit: 5 }),
      });
      // Also invalidate all jobs query
      queryClient.invalidateQueries({
        queryKey: trpc.jobs.getAll.queryKey(),
      });
      // Trigger immediate refetch
      refetch();
      console.log("📢 Invalidated job cache and triggered refetch");
    };

    window.addEventListener("newJobs", handleNewJobs as EventListener);
    return () => {
      window.removeEventListener("newJobs", handleNewJobs as EventListener);
    };
  }, [queryClient, trpc, refetch]);

  // Don't show if no jobs
  if (!isLoading && jobs.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between px-2">
        <SidebarGroupLabel>Recent Jobs</SidebarGroupLabel>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
          <Link href="/jobs">
            View All
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
      <SidebarGroupContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 px-2">
              {jobs.map((job) => (
                <JobProgressCard
                  key={job.jobId}
                  job={job}
                  compact
                  onClick={() => {
                    // Navigate to jobs page with this job focused
                    window.location.href = `/jobs?jobId=${job.jobId}`;
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        {activeJobs.length > 0 && (
          <div className="px-2 pt-2 text-xs text-muted-foreground">
            {activeJobs.length} active job{activeJobs.length !== 1 ? "s" : ""}
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
