"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type JobHistoryItem = {
  jobId: string;
  status: "queued" | "processing" | "done" | "failed" | "unknown";
  dealId: string;
  screenerId: string;
  createdAt: number;
  userId: string;
};

interface JobHistoryCardProps {
  job: JobHistoryItem;
}

function getStatusIcon(status: JobHistoryItem["status"]) {
  switch (status) {
    case "queued":
      return <Clock className="h-4 w-4 text-gray-500" />;
    case "processing":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-400" />;
  }
}

function getStatusColor(status: JobHistoryItem["status"]) {
  switch (status) {
    case "queued":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "processing":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "done":
      return "bg-green-100 text-green-700 border-green-200";
    case "failed":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getStatusText(status: JobHistoryItem["status"]) {
  switch (status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "done":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(),
    relative: getRelativeTime(timestamp),
  };
}

function getRelativeTime(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function JobHistoryCard({ job }: JobHistoryCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { date, time, relative } = formatDate(job.createdAt);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/job-history/${job.jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      toast.success("Job deleted successfully");

      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getStatusIcon(job.status)}
            <div>
              <div className="mb-1 flex items-center space-x-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {job.jobId.slice(0, 8)}...
                </span>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(job.status)} border`}
                >
                  {getStatusText(job.status)}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Deal ID: {job.dealId} • Screener: {job.screenerId}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium">{date}</div>
              <div className="text-xs text-muted-foreground">{time}</div>
              <div className="text-xs text-muted-foreground">{relative}</div>
            </div>

            <Link href={`/raw-deals/${job.dealId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Job History</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this job from your history?
                    This action cannot be undone.
                    <br />
                    <br />
                    <strong>Job ID:</strong> {job.jobId}
                    <br />
                    <strong>Deal ID:</strong> {job.dealId}
                    <br />
                    <strong>Status:</strong> {getStatusText(job.status)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
