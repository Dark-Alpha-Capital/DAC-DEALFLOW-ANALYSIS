import { RedisClient } from "bun";

const configuredUrl = process.env.REDIS_URL;
const redisUrlToUse = configuredUrl ?? "redis://127.0.0.1:6379";

export const redis = new RedisClient(redisUrlToUse);

export function createRedisClient(
  url?: string,
  options?: ConstructorParameters<typeof RedisClient>[1]
) {
  return new RedisClient(url ?? redisUrlToUse, options as any);
}

export type { RedisClient };
