import { RedisClient } from "bun";
import dotenv from "dotenv";

dotenv.config();

const configuredUrl = process.env.REDIS_URL;
const redisUrlToUse = configuredUrl ?? "redis://127.0.0.1:6379";

let redisInstance: RedisClient | null = null;

try {
  if (redisUrlToUse) {
    redisInstance = new RedisClient(redisUrlToUse);
    console.log("Redis client initialized");
  }
} catch (error) {
  console.error("Failed to initialize Redis client:", error);
  // Continue without Redis - the app should still start
}

export const redis = redisInstance;

export function createRedisClient(
  url?: string,
  options?: ConstructorParameters<typeof RedisClient>[1]
) {
  return new RedisClient(url ?? redisUrlToUse, options as any);
}

export type { RedisClient };
