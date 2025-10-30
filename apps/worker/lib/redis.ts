import Redis from "ioredis";

const configuredUrl = process.env.REDIS_URL;
const redisUrlToUse = configuredUrl ?? "redis://127.0.0.1:6379";

if (!configuredUrl) {
  console.warn(`REDIS_URL is not set. Falling back to ${redisUrlToUse}.`);
}

const redis = new Redis(redisUrlToUse);

redis.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redis.on("connect", () => {
  console.log("Redis client connected");
});

redis.on("ready", () => {
  console.log("Redis client ready");
});

redis.on("close", () => {
  console.log("Redis client connection closed");
});

redis.on("reconnecting", () => {
  console.log("Redis client reconnecting...");
});

// Ensure connection attempt begins immediately
redis.connect().catch((err) => {
  console.error("Failed to connect to Redis:", err);
});

export default redis;
export { redis };
