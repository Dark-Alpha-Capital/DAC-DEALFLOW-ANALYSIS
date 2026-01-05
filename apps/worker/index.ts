import { Worker } from "bullmq";
import IORedis from "ioredis";
import { screenDealHandler } from "./handlers/screen-deal-handler";
import { fileUploadHandler } from "./handlers/file-upload-handler";
import { QUEUE_NAMES } from "./lib/queues";
import { FLOW_QUEUE_NAMES } from "./lib/flow-queues";
import { closeIdempotencyConnection } from "./lib/idempotency";

// Flow handlers
import {
  fetchDataHandler,
  processChunksHandler,
  finalizeHandler,
  screenDealParentHandler,
} from "./handlers/flows/screen-deal-flow";
import {
  validateHandler,
  compressHandler,
  uploadHandler,
  fileUploadFinalizeHandler,
  fileUploadParentHandler,
} from "./handlers/flows/file-upload-flow";

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

  // ============================================================================
  // Legacy Workers (for backward compatibility during migration)
  // ============================================================================

  // Screen deal worker (legacy - non-flow)
  const screenDealWorker = new Worker(
    QUEUE_NAMES.SCREEN_DEAL,
    screenDealParentHandler, // Use flow parent handler (receives flow results)
    {
      connection,
      concurrency: 3,
    }
  );

  // File upload worker (legacy - non-flow)
  const fileUploadWorker = new Worker(
    QUEUE_NAMES.FILE_UPLOAD,
    fileUploadParentHandler, // Use flow parent handler (receives flow results)
    {
      connection,
      concurrency: 5,
    }
  );

  // ============================================================================
  // Screen Deal Flow Workers
  // ============================================================================

  const fetchDataWorker = new Worker(
    FLOW_QUEUE_NAMES.SCREEN_DEAL_FETCH,
    fetchDataHandler,
    {
      connection,
      concurrency: 5,
    }
  );

  const processChunksWorker = new Worker(
    FLOW_QUEUE_NAMES.SCREEN_DEAL_PROCESS_CHUNKS,
    processChunksHandler,
    {
      connection,
      concurrency: 3, // Limit concurrency for AI API calls
    }
  );

  const screenDealFinalizeWorker = new Worker(
    FLOW_QUEUE_NAMES.SCREEN_DEAL_FINALIZE,
    finalizeHandler,
    {
      connection,
      concurrency: 5,
    }
  );

  // ============================================================================
  // File Upload Flow Workers
  // ============================================================================

  const validateWorker = new Worker(
    FLOW_QUEUE_NAMES.FILE_UPLOAD_VALIDATE,
    validateHandler,
    {
      connection,
      concurrency: 10,
    }
  );

  const compressWorker = new Worker(
    FLOW_QUEUE_NAMES.FILE_UPLOAD_COMPRESS,
    compressHandler,
    {
      connection,
      concurrency: 5,
    }
  );

  const uploadWorker = new Worker(
    FLOW_QUEUE_NAMES.FILE_UPLOAD_UPLOAD,
    uploadHandler,
    {
      connection,
      concurrency: 5,
    }
  );

  const fileUploadFinalizeWorker = new Worker(
    FLOW_QUEUE_NAMES.FILE_UPLOAD_FINALIZE,
    fileUploadFinalizeHandler,
    {
      connection,
      concurrency: 5,
    }
  );

  // Collect all workers for event handling and shutdown
  const allWorkers = [
    { name: "screen-deal", worker: screenDealWorker },
    { name: "file-upload", worker: fileUploadWorker },
    { name: "fetch-data", worker: fetchDataWorker },
    { name: "process-chunks", worker: processChunksWorker },
    { name: "screen-deal-finalize", worker: screenDealFinalizeWorker },
    { name: "validate", worker: validateWorker },
    { name: "compress", worker: compressWorker },
    { name: "upload", worker: uploadWorker },
    { name: "file-upload-finalize", worker: fileUploadFinalizeWorker },
  ];

  // Register event handlers for all workers
  for (const { name, worker } of allWorkers) {
    worker.on("completed", (job) => {
      console.log(`[${name}] Job ${job.id} completed successfully`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[${name}] Job ${job?.id} failed: ${err.message}`);
    });

    worker.on("progress", (job, progress) => {
      console.log(`[${name}] Job ${job.id} progress:`, progress);
    });

    worker.on("error", (err) => {
      console.error(`[${name}] Worker error:`, err);
    });
  }

  workersReady = true;
  console.log(`All workers initialized successfully (${allWorkers.length} workers)`);
  console.log("Workers are listening for jobs...");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    try {
      // Close all workers
      await Promise.all(allWorkers.map(({ worker }) => worker.close()));
      console.log("All workers closed");

      // Close Redis connections
      await connection.quit();
      await closeIdempotencyConnection();
      console.log("All connections closed successfully");

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
