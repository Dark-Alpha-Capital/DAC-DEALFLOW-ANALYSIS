"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileText,
  Search,
} from "lucide-react";
import { getJobTypeLabel, type JobWithMetadata } from "@/lib/queue-types";
import { cn } from "@/lib/utils";

interface JobProgressCardProps {
  job: JobWithMetadata;
  compact?: boolean;
  onClick?: () => void;
}

const getStatusIcon = (state: JobWithMetadata["state"]) => {
  switch (state) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "active":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "waiting":
    case "delayed":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadgeVariant = (
  state: JobWithMetadata["state"],
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

const getJobTypeIcon = (queueName: JobWithMetadata["queueName"]) => {
  switch (queueName) {
    case "screen-deal":
      return <Search className="h-4 w-4" />;
    case "file-upload":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export function JobProgressCard({
  job,
  compact = false,
  onClick,
}: JobProgressCardProps) {
  const statusIcon = getStatusIcon(job.state);
  const jobTypeIcon = getJobTypeIcon(job.queueName);
  const progress = job.progress?.percentage ?? 0;
  const step = job.progress?.step ?? "Unknown";

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border p-2 text-sm transition-colors",
          onClick && "cursor-pointer hover:bg-muted/50",
        )}
        onClick={onClick}
      >
        <div className="flex-shrink-0">{statusIcon}</div>
        <div className="flex-shrink-0">{jobTypeIcon}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {getJobTypeLabel(job.queueName)}
          </div>
          <div className="truncate text-xs text-muted-foreground">{step}</div>
        </div>
        <div className="flex-shrink-0">
          <Badge variant={getStatusBadgeVariant(job.state)} className="text-xs">
            {job.state}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50",
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-shrink-0">{jobTypeIcon}</div>
              <h3 className="font-semibold text-sm">
                {getJobTypeLabel(job.queueName)}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{step}</p>
            {job.state === "active" && (
              <div className="space-y-1">
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {progress}% complete
                </p>
              </div>
            )}
            {job.failedReason && (
              <p className="text-xs text-destructive mt-2">
                {job.failedReason}
              </p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <Badge variant={getStatusBadgeVariant(job.state)}>
            {job.state}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(job.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
