/**
 * Sliding-window rate limit for Workers. Uses RATE_LIMIT_KV when bound; otherwise allows.
 */
export async function rateLimit(
  keyBase: string,
  max: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; reset: number }> {
  const bucket = Math.floor(Date.now() / windowMs);
  const key = `rl:${keyBase}:${bucket}`;
  const reset = (bucket + 1) * windowMs;

  try {
    const { env } = await import("cloudflare:workers");
    const kv = (env as { RATE_LIMIT_KV?: KVNamespace }).RATE_LIMIT_KV;
    if (!kv) {
      return { ok: true, remaining: max, reset };
    }
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    await kv.put(key, String(count), { expirationTtl: Math.ceil(windowMs / 1000) });
    const ok = count <= max;
    return { ok, remaining: Math.max(0, max - count), reset };
  } catch {
    return { ok: true, remaining: max, reset };
  }
}
