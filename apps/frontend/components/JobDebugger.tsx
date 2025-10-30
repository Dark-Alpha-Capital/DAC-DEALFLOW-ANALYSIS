"use client";

import { useJobWebSocket } from "@/hooks/use-job-websocket";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function JobDebugger({ userId }: { userId: string }) {
  const { jobs, activeJobs, completedJobs, isConnected, addJob } =
    useJobWebSocket(userId);
  const [testJobId, setTestJobId] = useState("");

  const createTestJob = () => {
    const jobId = `test-${Date.now()}`;
    addJob({
      jobId,
      dealId: "test-deal",
      status: "queued",
      createdAt: Date.now(),
      userEmail: "test@example.com",
    });
    setTestJobId(jobId);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">Job Debugger</h3>

      <div className="flex items-center gap-2">
        <span>WebSocket:</span>
        <div
          className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <div className="flex items-center gap-2">
        <span>Total Jobs:</span>
        <span className="font-mono">{jobs.size}</span>
      </div>

      <div className="flex items-center gap-2">
        <span>Active Jobs:</span>
        <span className="font-mono">{activeJobs.length}</span>
      </div>

      <div className="flex items-center gap-2">
        <span>Completed Jobs:</span>
        <span className="font-mono">{completedJobs.length}</span>
      </div>

      <Button onClick={createTestJob} variant="outline" size="sm">
        Create Test Job
      </Button>

      {testJobId && (
        <div className="text-xs text-muted-foreground">
          Test Job ID: {testJobId}
        </div>
      )}

      {activeJobs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium">Active Jobs:</h4>
          <div className="space-y-1">
            {activeJobs.map((job) => (
              <div key={job.jobId} className="font-mono text-xs">
                {job.jobId}: {job.status}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
