"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Job = {
  jobId: string;
  dealId: string;
  status: "queued" | "processing" | "done" | "failed";
  createdAt: number;
  userEmail?: string;
};

export function useJobWebSocket(userId: string) {
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingSubscriptions = useRef<Set<string>>(new Set());

  // Simplified WebSocket connection with automatic reconnection
  useEffect(() => {
    const connect = () => {
      console.log("🔌 Connecting to WebSocket...");
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL!);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);

        pendingSubscriptions.current.forEach((jobId) => {
          ws.send(JSON.stringify({ action: "subscribe", jobId }));
          console.log(`🔄 Resubscribed to job: ${jobId}`);
        });
        pendingSubscriptions.current.clear();
      };

      ws.onmessage = (e) => {
        try {
          const message = JSON.parse(e.data);
          console.log("📨 WebSocket message:", message);

          if (message.type === "connected") {
            console.log(`🆔 Client ID: ${message.clientId}`);
          } else if (message.jobId && message.status) {
            console.log(`📊 Job ${message.jobId}: ${message.status}`);
            setJobs((prev) => {
              const updated = new Map(prev);
              const job = updated.get(message.jobId);
              if (job) {
                job.status = message.status;
                updated.set(message.jobId, job);
              }
              return updated;
            });
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        setIsConnected(false);
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const subscribeToJob = useCallback((jobId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "subscribe", jobId }));
      console.log(`📤 Subscribed to job: ${jobId}`);
    } else {
      console.log(`⏳ Queueing subscription for job: ${jobId}`);
      pendingSubscriptions.current.add(jobId);
    }
  }, []);

  const addJob = useCallback(
    (job: Job) => {
      console.log(`➕ Adding job: ${job.jobId}`);
      setJobs((prev) => new Map(prev).set(job.jobId, job));
      subscribeToJob(job.jobId);
    },
    [subscribeToJob],
  );

  useEffect(() => {
    const handleNewJobs = (e: CustomEvent) => {
      const newJobs = e.detail;
      newJobs.forEach((job: any) => {
        if (job.userId === userId) {
          addJob({
            jobId: job.jobId,
            dealId: job.dealId,
            status: "queued",
            createdAt: Date.now(),
            userEmail: job.userEmail,
          });
        }
      });
    };

    window.addEventListener("newJobs", handleNewJobs as EventListener);
    return () =>
      window.removeEventListener("newJobs", handleNewJobs as EventListener);
  }, [userId, addJob]);

  const activeJobs = Array.from(jobs.values()).filter(
    (job) => job.status === "queued" || job.status === "processing",
  );

  const completedJobs = Array.from(jobs.values()).filter(
    (job) => job.status === "done" || job.status === "failed",
  );

  return { jobs, activeJobs, completedJobs, isConnected, addJob };
}
