import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL as string;

// Create Redis client
const client = createClient({
  url: redisUrl,
});

// Handle connection errors
client.on("error", (err) => console.error("Redis Client Error", err));

// Connect to Redis
let isConnecting = false;
let connectionPromise: Promise<unknown> | null = null;

async function ensureConnected() {
  if (client.isOpen) {
    return;
  }

  if (isConnecting && connectionPromise) {
    await connectionPromise;
    return;
  }

  isConnecting = true;
  connectionPromise = client.connect().catch((err) => {
    isConnecting = false;
    connectionPromise = null;
    throw err;
  });

  await connectionPromise;
  isConnecting = false;
  connectionPromise = null;
}

// Wrapper to ensure connection before operations
// Using lowercase method names to match existing codebase usage
export const redisClient = {
  async incr(key: string) {
    await ensureConnected();
    return client.incr(key);
  },
  async pexpire(key: string, ms: number) {
    await ensureConnected();
    return client.pExpire(key, ms);
  },
  async keys(pattern: string) {
    await ensureConnected();
    return client.keys(pattern);
  },
  async hgetall(key: string) {
    await ensureConnected();
    return client.hGetAll(key);
  },
  async hget(key: string, field: string) {
    await ensureConnected();
    return client.hGet(key, field);
  },
  async hmset(key: string, value: Record<string, string>) {
    await ensureConnected();
    return client.hSet(key, value);
  },
  async hSet(key: string, value: Record<string, string>) {
    await ensureConnected();
    return client.hSet(key, value);
  },
  async del(key: string) {
    await ensureConnected();
    return client.del(key);
  },
  async expire(key: string, seconds: number) {
    await ensureConnected();
    return client.expire(key, seconds);
  },
  async lrange(key: string, start: number, stop: number) {
    await ensureConnected();
    return client.lRange(key, start, stop);
  },
  async exists(key: string) {
    await ensureConnected();
    return client.exists(key);
  },
};

export async function rateLimit(
  keyBase: string,
  max: number,
  windowMs: number,
) {
  const bucket = Math.floor(Date.now() / windowMs);
  const key = `rl:${keyBase}:${bucket}`;
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.pexpire(key, windowMs);
  const ok = count <= max;
  const reset = (bucket + 1) * windowMs;
  return { ok, remaining: Math.max(0, max - count), reset };
}
