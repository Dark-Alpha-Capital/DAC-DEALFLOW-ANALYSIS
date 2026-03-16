import { NextResponse } from "next/server";
import { pingRedis } from "@repo/redis-queue/redis";

export async function GET() {
  const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  const ok = await pingRedis(redisUrl);
  if (ok) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { ok: false, error: "Redis ping failed" },
    { status: 503 },
  );
}
