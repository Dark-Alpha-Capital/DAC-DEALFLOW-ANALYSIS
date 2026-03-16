import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL as string;
const defaultUrl = redisUrl ?? "redis://127.0.0.1:6379";

const client = createClient({ url: defaultUrl });
client.on("error", (err) => console.error("Redis Client Error", err));

let isConnecting = false;
let connectionPromise: Promise<void> | null = null;

async function ensureConnected() {
  if (client.isOpen) return;
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

export function createRedisClient(url?: string) {
  return createClient({ url: url ?? defaultUrl });
}

export async function pingRedis(url?: string): Promise<boolean> {
  const c = createRedisClient(url);
  try {
    await c.connect();
    await c.ping();
    return true;
  } catch {
    return false;
  } finally {
    try {
      await c.quit();
    } catch {
      // ignore
    }
  }
}
