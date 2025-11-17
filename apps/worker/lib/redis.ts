import { createClient, RedisClientType } from "redis";

const redisUrl = process.env.REDIS_URL as string;

let redisClient: RedisClientType | null = null;

if (redisUrl) {
  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  // Connect to Redis (non-blocking)
  redisClient.connect().catch((err) => {
    console.error("Failed to connect to Redis:", err);
  });
} else {
  console.warn("REDIS_URL not configured, Redis features will be unavailable");
}

// Export both for compatibility
export { redisClient };
export const redis = redisClient;
