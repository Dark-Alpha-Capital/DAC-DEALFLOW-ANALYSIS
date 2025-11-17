import { Hono } from "hono";
import db from "db";

console.log("Starting backend server...");
console.log(`Node version: ${process.version}`);
console.log(`Working directory: ${process.cwd()}`);

const app = new Hono();

app.get("/", (c) => c.text("Hello Bun from deployed Google Cloud Run!"));
app.get("/users", async (c) => {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
    });
    return c.json(users);
  } catch (error) {
    console.error("Error fetching users", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/health", async (c) => {
  try {
    return c.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error("Error in health check", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/redis-health", async (c) => {
  try {
    return c.text("OK");
  } catch (error) {
    console.error("Error pinging Redis", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

const port = Number(process.env.PORT) || 8080;
const hostname = process.env.HOST || "0.0.0.0";

try {
  // Start the server
  const server = Bun.serve({
    port,
    hostname,
    fetch: app.fetch,
  });

  console.log(`Backend server listening on ${hostname}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}

export default app;
