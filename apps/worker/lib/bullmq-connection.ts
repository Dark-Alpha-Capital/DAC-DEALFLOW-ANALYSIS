import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL as string;
const redisUrlToUse = redisUrl ?? "redis://127.0.0.1:6379";

// BullMQ requires ioredis (not Bun's RedisClient or node-redis)
// maxRetriesPerRequest: null is required for BullMQ workers
export const connection = new IORedis(redisUrlToUse, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false, // Disable ready check - Redis user may not have INFO permission
});

connection.on("error", (err) => {
  // Suppress Redis INFO permission errors - they're non-fatal
  const errorMessage = err instanceof Error ? err.message : String(err);
  if (errorMessage.includes("NOPERM") && errorMessage.includes("info")) {
    // Silently ignore - these are expected when Redis user lacks INFO permission
    return;
  }
  console.error("BullMQ Redis connection error:", err);
});

connection.on("connect", () => {
  console.log("BullMQ Redis connected");
});

// Create a duplicate connection for subscribers (required by BullMQ for some features)
export function createConnection() {
  return new IORedis(redisUrlToUse, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false, // Disable ready check - Redis user may not have INFO permission
  });
}
