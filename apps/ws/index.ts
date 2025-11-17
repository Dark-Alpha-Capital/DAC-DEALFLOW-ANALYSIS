// WebSocket server for real-time job updates
import type { ServerWebSocket } from "bun";
import { RedisClient } from "bun";

console.log("Starting WebSocket server...");
console.log(`Node version: ${process.version}`);
console.log(`Working directory: ${process.cwd()}`);

type WS = ServerWebSocket<unknown>;

const clientIds = new Map<WS, string>();
const clientJobs = new Map<WS, Set<string>>();
// Map: jobId → WebSocket
const jobSubscriptions = new Map<string, WS>();

// Initialize Redis connection with error handling
let redis: RedisClient | null = null;

try {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redis = new RedisClient(redisUrl);
    console.log("Redis client initialized");

    // Subscribe to Redis channel (non-blocking)
    try {
      redis.subscribe("job-updates", (msg, channel) => {
        try {
          const update = JSON.parse(msg?.toString() ?? "");
          console.log("📨 Redis message received:", channel, update);

          const ws = jobSubscriptions.get(update.jobId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            const clientId = clientIds.get(ws);
            console.log(
              `📤 Sending update for job ${update.jobId} to client ${clientId}`
            );
            ws.send(JSON.stringify(update));
          } else {
            console.log(
              `⚠️ No active WebSocket subscription for job ${update.jobId}`
            );
            console.log(`📊 Active subscriptions: ${jobSubscriptions.size}`);
            console.log(`📊 Connected clients: ${clientIds.size}`);
          }
        } catch (error) {
          console.error("❌ Error processing Redis message:", channel, error);
        }
      });
      console.log("✅ Subscribed to Redis channel: job-updates");
    } catch (error) {
      console.error("❌ Error subscribing to Redis channel:", error);
      // Continue without Redis - server should still start
    }
  } else {
    console.warn(
      "⚠️ REDIS_URL not configured, Redis features will be disabled"
    );
  }
} catch (error) {
  console.error("❌ Failed to initialize Redis client:", error);
  // Continue without Redis - server should still start
}

// Start WebSocket server
const port = Number(process.env.PORT) || 8080;
const hostname = process.env.HOST || "0.0.0.0";

try {
  const server = Bun.serve({
    port,
    hostname,
    fetch(req, server) {
      if (server.upgrade(req)) return;
      return new Response("WebSocket server", { status: 200 });
    },
    websocket: {
      open(ws) {
        const clientId = crypto.randomUUID();
        clientIds.set(ws, clientId);
        clientJobs.set(ws, new Set());
        console.log(`✅ Client connected: ${clientId}`);
        ws.send(JSON.stringify({ type: "connected", clientId }));
      },
      message(ws, message) {
        try {
          const data = JSON.parse(message.toString());
          console.log("📨 WebSocket message received:", data);

          if (data.action === "subscribe" && data.jobId) {
            jobSubscriptions.set(data.jobId, ws);
            clientJobs.get(ws)?.add(data.jobId);
            const clientId = clientIds.get(ws);
            console.log(
              `🔔 Client ${clientId} subscribed to job: ${data.jobId}`
            );
            console.log(`📊 Total subscriptions now: ${jobSubscriptions.size}`);
            ws.send(JSON.stringify({ type: "subscribed", jobId: data.jobId }));
          }
        } catch (error) {
          console.error("❌ Error processing WebSocket message:", error);
        }
      },
      close(ws) {
        const clientId = clientIds.get(ws);
        const jobs = clientJobs.get(ws);

        // Clean up job subscriptions
        jobs?.forEach((jobId) => jobSubscriptions.delete(jobId));

        clientIds.delete(ws);
        clientJobs.delete(ws);
        console.log(
          `👋 Client disconnected: ${clientId} (had ${jobs?.size || 0} jobs)`
        );
      },
    },
  });

  console.log(`✅ WebSocket server running on ${hostname}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Redis configured: ${redis ? "Yes" : "No"}`);
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}

// Graceful shutdown for Google Cloud Run
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, starting graceful shutdown...`);

  // Close Redis connection if it exists
  if (redis) {
    try {
      // Bun's RedisClient will close when process exits
      console.log("Redis connection will be closed on process exit");
    } catch (error) {
      console.error("Error closing Redis connection:", error);
    }
  }

  console.log("Graceful shutdown complete");
  process.exit(0);
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
