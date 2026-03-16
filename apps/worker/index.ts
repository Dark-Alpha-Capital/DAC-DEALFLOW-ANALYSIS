import { config } from "dotenv";
import { resolve } from "path";

// Load worker .env so DATABASE_URL matches migrations (avoids "relation does not exist")
config({ path: resolve(import.meta.dir, ".env") });
config({ path: resolve(import.meta.dir, ".env.local") });

import { Worker } from "bullmq";
import { connection } from "@repo/redis-queue/connection";
import { fileUploadHandler } from "./handlers/file-upload-handler";
import { screenDealHandler } from "./handlers/screen-deal-handler";
import { cimExtractionHandler } from "./handlers/cim-extraction-handler";
import { ragIngestionHandler } from "./handlers/rag-ingestion-handler";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set");
}

// Worker 1: Handles Emails
// Concurrency: 10 (Process 10 emails at the same time)
const fileUploadWorker = new Worker("file-upload", fileUploadHandler, {
  connection,
  concurrency: 10,
});

const screenDealWorker = new Worker("screen-deal", screenDealHandler, {
  connection,
  concurrency: 10,
});

const cimExtractionWorker = new Worker("cim-extraction", cimExtractionHandler, {
  connection,
  concurrency: 5,
});

const ragIngestionWorker = new Worker("rag-ingestion", ragIngestionHandler, {
  connection,
  concurrency: 5,
});

console.log("Workers are listening for jobs...");

screenDealWorker.on("failed", (job, err) =>
  console.error(`Screen Deal Job failed: ${err.message}`)
);

screenDealWorker.on("completed", (job) =>
  console.log(`Screen Deal Job ${job.id} completed successfully`)
);

fileUploadWorker.on("failed", (job, err) =>
  console.error(`File Upload Job failed: ${err.message}`)
);

fileUploadWorker.on("completed", (job) =>
  console.log(`File Upload Job ${job.id} completed successfully`)
);

cimExtractionWorker.on("failed", (job, err) =>
  console.error(`CIM Extraction Job failed: ${err.message}`)
);

cimExtractionWorker.on("completed", (job) =>
  console.log(`CIM Extraction Job ${job.id} completed successfully`)
);

ragIngestionWorker.on("failed", (job, err) =>
  console.error(`RAG Ingestion Job failed: ${err.message}`)
);

ragIngestionWorker.on("completed", (job) =>
  console.log(`RAG Ingestion Job ${job.id} completed successfully`)
);

// Cloud Run requires the container to listen on PORT for health checks
// Start a minimal HTTP server for health checks
const port = parseInt(process.env.PORT || "8080", 10);

Bun.serve({
  port,
  fetch(request) {
    // Health check endpoint - Cloud Run will ping this
    const url = new URL(request.url);
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "bullmq-worker",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Health check server listening on port ${port}`);
