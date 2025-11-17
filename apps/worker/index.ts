import express from "express";
import screenDealRouter from "./routes/screen-deal";
import fileUploadRouter from "./routes/file-upload";
import { redis } from "./lib/redis";

console.log("Starting worker server...");
console.log(`Node version: ${process.version}`);
console.log(`Working directory: ${process.cwd()}`);
console.log("Express and routes imported successfully");

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint with Redis status
app.get("/", (req, res) => {
  console.log("Root check");
  res.send("OK");
});

app.get("/health", async (req, res) => {
  console.log("Health check");

  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    redis: redis ? "connected" : "not configured",
    uptime: process.uptime(),
  };

  res.json(health);
});

// Mount route modules
app.use(screenDealRouter);
app.use(fileUploadRouter);

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

let server: ReturnType<typeof app.listen> | null = null;

try {
  server = app.listen(PORT, HOST, () => {
    console.log(`Worker HTTP server listening on ${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `Redis URL configured: ${process.env.REDIS_URL ? "Yes" : "No"}`
    );
  });

  server.on("error", (error: Error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}

// Graceful shutdown for Google Cloud Run
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log("HTTP server closed");

      // Close Redis connection if it exists
      if (redis) {
        try {
          // Bun's RedisClient may not have quit(), so we'll just log
          // The connection will be closed when the process exits
          console.log("Redis connection will be closed on process exit");
        } catch (error) {
          console.error("Error closing Redis connection:", error);
        }
      }

      console.log("Graceful shutdown complete");
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
