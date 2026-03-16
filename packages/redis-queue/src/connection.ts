import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL as string;
const redisUrlToUse = redisUrl ?? "redis://127.0.0.1:6379";

// BullMQ requires ioredis (not node-redis)
// maxRetriesPerRequest: null is required for BullMQ
export const connection = new IORedis(redisUrlToUse, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false, // Disable ready check - Redis user may not have INFO permission
});

connection.on("error", (err) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  if (errorMessage.includes("NOPERM") && errorMessage.includes("info")) {
    return;
  }
  console.error("BullMQ Redis connection error:", err);
});

connection.on("connect", () => {
  console.log("BullMQ Redis connected");
});

export function createConnection() {
  return new IORedis(redisUrlToUse, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
