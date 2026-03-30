
import { useEffect, useState } from "react";

export function RedisConnectionStatus() {
  const [status, setStatus] = useState<
    "loading" | "connected" | "disconnected"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health/redis")
      .then((res) => res.json())
      .then((data: { ok?: boolean; error?: string }) => {
        setStatus(data.ok ? "connected" : "disconnected");
        if (!data.ok) setError(data.error ?? "Connection failed");
      })
      .catch((err: Error) => {
        setStatus("disconnected");
        setError(err.message ?? "Request failed");
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-2xl font-semibold">Redis Connection</h1>
      <div className="flex flex-col items-center gap-4">
        <div
          className={`h-16 w-16 rounded-full ${
            status === "loading"
              ? "animate-pulse bg-amber-500"
              : status === "connected"
                ? "bg-green-500 shadow-[0_0_24px_rgba(34,197,94,0.6)]"
                : "bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.6)]"
          }`}
        />
        <p className="text-lg font-medium">
          {status === "loading"
            ? "Checking..."
            : status === "connected"
              ? "Connected"
              : "Disconnected"}
        </p>
        {error && (
          <p className="text-muted-foreground max-w-md text-center text-sm">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
