import { Worker } from "bullmq";
import IORedis from "ioredis";
import { screenDealHandler } from "./handlers/screen-deal-handler";
import { fileUploadHandler } from "./handlers/file-upload-handler";
import { QUEUE_NAMES } from "./lib/queues";

// Cloud Run requires the container to listen on PORT for health checks
// Start HTTP server FIRST before initializing workers
const port = parseInt(process.env.PORT || "8080", 10);

let workersReady = false;
let workersError: string | null = null;

// Start HTTP server immediately for Cloud Run health checks
const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);

    // Health check endpoint - Cloud Run will ping this
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: workersReady ? "ok" : "starting",
          service: "bullmq-worker",
          workersReady,
          error: workersError,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: workersReady ? 200 : 503, // 503 while starting, 200 when ready
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Health check server listening on port ${port}`);
console.log(`Node version: ${process.version}`);
console.log(`Working directory: ${process.cwd()}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);

// Initialize workers asynchronously after server is running
async function initializeWorkers() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  console.log("Connecting to Redis...");
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy: () => null, // Disable retries - fail fast
    connectTimeout: 10000, // 10 second timeout
    enableReadyCheck: true,
    lazyConnect: true, // Don't connect immediately, we'll call connect() explicitly
  });

  // Attempt connection - fail fast if it doesn't work
  try {
    await connection.connect();
    console.log("Redis connection established");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Fatal: Failed to connect to Redis:", errorMessage);
    // Try to clean up connection, but don't fail if it's already closed
    try {
      await connection.quit();
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Fatal Redis connection error: ${errorMessage}`);
  }

  console.log("Initializing workers...");

  // Screen deal worker
  const screenDealWorker = new Worker(
    QUEUE_NAMES.SCREEN_DEAL,
    screenDealHandler,
    {
      connection,
      concurrency: 3, // Process up to 3 jobs concurrently
    }
  );

  // File upload worker
  const fileUploadWorker = new Worker(
    QUEUE_NAMES.FILE_UPLOAD,
    fileUploadHandler,
    {
      connection,
      concurrency: 5, // Process up to 5 file uploads concurrently
    }
  );

  // Screen deal worker events
  screenDealWorker.on("completed", (job) => {
    console.log(`[screen-deal] Job ${job.id} completed successfully`);
  });

  screenDealWorker.on("failed", (job, err) => {
    console.error(`[screen-deal] Job ${job?.id} failed: ${err.message}`);
  });

  screenDealWorker.on("progress", (job, progress) => {
    console.log(`[screen-deal] Job ${job.id} progress:`, progress);
  });

  screenDealWorker.on("error", (err) => {
    console.error("[screen-deal] Worker error:", err);
  });

  // File upload worker events
  fileUploadWorker.on("completed", (job) => {
    console.log(`[file-upload] Job ${job.id} completed successfully`);
  });

  fileUploadWorker.on("failed", (job, err) => {
    console.error(`[file-upload] Job ${job?.id} failed: ${err.message}`);
  });

  fileUploadWorker.on("progress", (job, progress) => {
    console.log(`[file-upload] Job ${job.id} progress:`, progress);
  });

  fileUploadWorker.on("error", (err) => {
    console.error("[file-upload] Worker error:", err);
  });

  workersReady = true;
  console.log("All workers initialized successfully");
  console.log("Workers are listening for jobs...");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    try {
      await Promise.all([screenDealWorker.close(), fileUploadWorker.close()]);
      await connection.quit();
      console.log("All workers closed successfully");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit - let the workers continue running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit - let the workers continue running
});

// Start worker initialization asynchronously
initializeWorkers().catch((error) => {
  workersError = error instanceof Error ? error.message : String(error);
  console.error("Fatal error in worker initialization:", error);
  process.exit(1); // Exit with error code - container should restart
});
