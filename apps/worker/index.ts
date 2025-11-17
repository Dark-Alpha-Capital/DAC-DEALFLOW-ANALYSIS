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

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check Redis connection
    const redisStatus = redis ? "connected" : "not configured";
    if (redis) {
      try {
        await redis.ping();
      } catch (error) {
        return res.status(503).json({
          status: "unhealthy",
          redis: "disconnected",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    res.json({
      status: "healthy",
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Worker server is running" });
});

// Mount route modules
app.use(screenDealRouter);
app.use(fileUploadRouter);

const port = parseInt(process.env.PORT || "8080");

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
  console.log(`PORT env var: ${process.env.PORT}`);
});
