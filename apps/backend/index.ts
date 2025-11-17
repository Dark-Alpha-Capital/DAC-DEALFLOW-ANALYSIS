import { Hono } from "hono";
import db from "db";

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

// Start the server
Bun.serve({
  port,
  hostname,
  fetch: app.fetch,
});

console.log(`Backend server listening on ${hostname}:${port}`);

export default app;
