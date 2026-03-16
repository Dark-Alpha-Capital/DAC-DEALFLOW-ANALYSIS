"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobProgressCard } from "@/components/job-progress-card";
import { useJobs } from "@/hooks/use-jobs";
import {
  getJobTypeLabel,
  type JobWithMetadata,
  type JobType,
} from "@repo/redis-queue/types";
import { Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type JobStatus = JobWithMetadata["state"];

interface ShowJobsComponentProps {
  focusedJobId?: string | null;
}

export function ShowJobsComponent({ focusedJobId }: ShowJobsComponentProps) {
  const { jobs, isLoading, refetch } = useJobs();
  const trpc = useTRPC();

  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<JobType | "all">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Delete mutation
  const { mutate: deleteJob, isPending: isDeleting } = useMutation(
    trpc.jobs.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Job deleted successfully");
        setDeletingJobId(null);
        setSelectedJobs(new Set());
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete job");
        setDeletingJobId(null);
      },
    }),
  );

  // Bulk delete mutation
  const { mutate: bulkDeleteJobs, isPending: isBulkDeleting } = useMutation(
    trpc.jobs.bulkDelete.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Successfully deleted ${data.deletedCount} job(s)`);
        setSelectedJobs(new Set());
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete jobs");
      },
    }),
  );

  // Auto-refresh every 2 seconds if there are active jobs
  const activeJobsCount = jobs.filter(
    (job) => job.state === "active" || job.state === "waiting",
  ).length;

  useEffect(() => {
    if (activeJobsCount === 0) return;

    const interval = setInterval(() => {
      refetch();
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobsCount, refetch]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesStatus =
        statusFilter === "all" || job.state === statusFilter;
      const matchesType = typeFilter === "all" || job.queueName === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [jobs, statusFilter, typeFilter]);

  // Check if all filtered jobs are selected
  const allSelected = useMemo(() => {
    return (
      filteredJobs.length > 0 &&
      filteredJobs.every((job) => selectedJobs.has(job.jobId))
    );
  }, [filteredJobs, selectedJobs]);

  // Check if some (but not all) jobs are selected
  const someSelected = useMemo(() => {
    return (
      filteredJobs.some((job) => selectedJobs.has(job.jobId)) && !allSelected
    );
  }, [filteredJobs, selectedJobs, allSelected]);

  // Scroll to focused job if provided
  useEffect(() => {
    if (focusedJobId && focusedJobId !== null) {
      setTimeout(() => {
        const element = document.getElementById(`job-${focusedJobId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 3000);
        }
      }, 100);
    }
  }, [focusedJobId]);

  const getStatusBadgeVariant = (
    state: JobStatus,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (state) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "active":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getJobLink = (job: JobWithMetadata): string | null => {
    if (job.dealId) {
      return `/raw-deals/${job.dealId}`;
    }
    return null;
  };

  const handleDelete = (job: JobWithMetadata) => {
    setDeletingJobId(job.jobId);
    deleteJob({
      jobId: job.jobId,
      queueName: job.queueName,
    });
  };

  const handleBulkDelete = () => {
    const jobsToDelete = filteredJobs
      .filter((job) => selectedJobs.has(job.jobId))
      .map((job) => ({
        jobId: job.jobId,
        queueName: job.queueName,
      }));

    if (jobsToDelete.length === 0) return;

    bulkDeleteJobs({ jobs: jobsToDelete });
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered jobs
      setSelectedJobs((prev) => {
        const next = new Set(prev);
        filteredJobs.forEach((job) => next.delete(job.jobId));
        return next;
      });
    } else {
      // Select all filtered jobs
      setSelectedJobs((prev) => {
        const next = new Set(prev);
        filteredJobs.forEach((job) => next.add(job.jobId));
        return next;
      });
    }
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedCount = filteredJobs.filter((job) =>
    selectedJobs.has(job.jobId),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Your Jobs</h2>
          <p className="text-muted-foreground">
            Monitor and manage your background job progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedCount} job{selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as any)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as any)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="screen-deal">Screen Deal</SelectItem>
            <SelectItem value="file-upload">File Upload</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto text-sm text-muted-foreground">
          {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
          {activeJobsCount > 0 && (
            <span className="ml-2">({activeJobsCount} active)</span>
          )}
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No jobs found matching your filters.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all jobs"
                  />
                </TableHead>
                <TableHead>Job Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => {
                const jobLink = getJobLink(job);
                const isSelected = selectedJobs.has(job.jobId);
                const isDeletingThis =
                  deletingJobId === job.jobId && isDeleting;
                return (
                  <TableRow
                    key={job.jobId}
                    id={`job-${job.jobId}`}
                    className={cn(
                      focusedJobId === job.jobId && "bg-muted/50",
                      isSelected && "bg-muted/30",
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleJobSelection(job.jobId)}
                        aria-label={`Select job ${job.jobId}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {getJobTypeLabel(job.queueName)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(job.state)}>
                        {job.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[200px]">
                      {job.state === "active" ? (
                        <div className="space-y-1">
                          <Progress
                            value={job.progress?.percentage ?? 0}
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground">
                            {job.progress?.percentage ?? 0}%
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {job.state === "completed" ? "100%" : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-sm">
                        {job.progress?.step ?? "Unknown"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {jobLink && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={jobLink}>
                              <Search className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(job)}
                          disabled={isDeletingThis || isBulkDeleting}
                        >
                          {isDeletingThis ? (
                            <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const isDeletingThis = deletingJobId === job.jobId && isDeleting;
            return (
              <div key={job.jobId} id={`job-${job.jobId}`} className="relative">
                <JobProgressCard job={job} />
                <div className="absolute right-2 top-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDelete(job)}
                    disabled={isDeletingThis || isBulkDeleting}
                  >
                    {isDeletingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
