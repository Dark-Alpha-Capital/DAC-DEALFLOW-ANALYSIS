import { Hono } from "hono";
import db from "db";

const app = new Hono();
app.get("/", (c) => c.text("Hello Bun!"));

export default app;
