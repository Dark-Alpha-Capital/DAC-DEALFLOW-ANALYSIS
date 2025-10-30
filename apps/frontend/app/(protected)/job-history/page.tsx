import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import { redisClient } from "@/lib/redis";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RefreshButton } from "./refresh-button";
import { JobHistoryCard } from "./job-history-card";
import { DeleteAllButton } from "./delete-all-button";

type JobHistoryItem = {
  jobId: string;
  status: "queued" | "processing" | "done" | "failed" | "unknown";
  dealId: string;
  screenerId: string;
  createdAt: number;
  userId: string;
};

async function getJobHistory(): Promise<JobHistoryItem[]> {
  const userSession = await auth();

  if (!userSession) {
    redirect("/auth/login");
  }

  try {
    // Get all job keys from Redis
    const jobKeys = await redisClient.keys("job:*");

    if (jobKeys.length === 0) {
      return [];
    }

    // Fetch all job data in parallel
    const jobPromises = jobKeys.map(async (key) => {
      try {
        const jobData = await redisClient.hgetall(key);
        const jobId = key.replace("job:", "");

        // Only return jobs for the current user
        if (jobData.userId === userSession.user.id) {
          return {
            jobId,
            status: (jobData.status || "unknown") as JobHistoryItem["status"],
            dealId: jobData.dealId || "",
            screenerId: jobData.screenerId || "",
            createdAt: parseInt(jobData.createdAt || "0"),
            userId: jobData.userId || "",
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching job data for key ${key}:`, error);
        return null;
      }
    });

    const allJobs = await Promise.all(jobPromises);

    // Filter out null values and sort by creation date (newest first)
    const userJobs = allJobs
      .filter((job): job is NonNullable<typeof job> => job !== null)
      .sort((a, b) => b.createdAt - a.createdAt);

    return userJobs;
  } catch (error) {
    console.error("Error fetching job history:", error);
    return [];
  }
}

export default async function JobHistoryPage() {
  const jobs = await getJobHistory();

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job History</h1>
          <p className="text-muted-foreground">
            View your deal screening job history for the last 24 hours
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {jobs.length > 0 && <DeleteAllButton />}
          <RefreshButton />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {jobs.filter((job) => job.status === "done").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {jobs.filter((job) => job.status === "processing").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {jobs.filter((job) => job.status === "failed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job List */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No job history found</h3>
            <p className="text-center text-muted-foreground">
              Jobs older than 24 hours are automatically removed.
              <br />
              Start screening some deals to see your job history here!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Jobs</h2>
          {jobs.map((job) => (
            <JobHistoryCard key={job.jobId} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
