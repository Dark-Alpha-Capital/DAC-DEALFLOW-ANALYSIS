import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

// Separate Redis connection for idempotency storage
// This avoids interfering with BullMQ's connection
const idempotencyRedis = new IORedis(redisUrl);

idempotencyRedis.on("error", (err) => {
  console.error("[Idempotency Redis] Error:", err);
});

/**
 * Default TTL for idempotency keys (24 hours)
 */
const DEFAULT_TTL_SECONDS = 86400;

/**
 * Prefix for idempotency keys to avoid collisions
 */
const KEY_PREFIX = "idempotency:";

/**
 * Generates a consistent idempotency key from job type and unique identifiers.
 * Keys are sorted to ensure consistent ordering regardless of input order.
 */
export function generateIdempotencyKey(
  jobType: string,
  uniqueIdentifiers: Record<string, string>
): string {
  const sorted = Object.entries(uniqueIdentifiers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return `${KEY_PREFIX}${jobType}:${sorted}`;
}

/**
 * Result of an idempotency check
 */
export interface IdempotencyCheckResult<T = unknown> {
  completed: boolean;
  result?: T;
}

/**
 * Checks if an operation with the given idempotency key has already been completed.
 * Returns the cached result if available.
 */
export async function checkIdempotency<T = unknown>(
  key: string
): Promise<IdempotencyCheckResult<T>> {
  try {
    const cached = await idempotencyRedis.get(key);
    if (cached) {
      return {
        completed: true,
        result: JSON.parse(cached) as T,
      };
    }
    return { completed: false };
  } catch (error) {
    console.error("[Idempotency] Check error:", error);
    // On error, assume not completed to allow retry
    return { completed: false };
  }
}

/**
 * Marks an operation as completed with its result.
 * The result is cached for the specified TTL.
 */
export async function markCompleted<T = unknown>(
  key: string,
  result: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  try {
    await idempotencyRedis.setex(key, ttlSeconds, JSON.stringify(result));
  } catch (error) {
    console.error("[Idempotency] Mark completed error:", error);
    // Don't throw - the operation was still successful
  }
}

/**
 * Clears an idempotency key (useful for testing or forced retries).
 */
export async function clearIdempotency(key: string): Promise<void> {
  try {
    await idempotencyRedis.del(key);
  } catch (error) {
    console.error("[Idempotency] Clear error:", error);
  }
}

/**
 * Executes an operation with idempotency protection.
 * If the operation was previously completed, returns the cached result.
 * Otherwise, executes the operation and caches the result.
 */
export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<{ result: T; fromCache: boolean }> {
  // Check if already completed
  const cached = await checkIdempotency<T>(key);
  if (cached.completed && cached.result !== undefined) {
    console.log(`[Idempotency] Cache hit for key: ${key}`);
    return { result: cached.result, fromCache: true };
  }

  // Execute the operation
  const result = await operation();

  // Mark as completed
  await markCompleted(key, result, ttlSeconds);

  return { result, fromCache: false };
}

/**
 * Cleanup function to close the Redis connection gracefully.
 */
export async function closeIdempotencyConnection(): Promise<void> {
  await idempotencyRedis.quit();
}
