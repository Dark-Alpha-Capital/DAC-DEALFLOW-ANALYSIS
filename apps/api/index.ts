import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  const x = 12;
  return c.json({ message: "Hello, world!" });
});

export default app;
