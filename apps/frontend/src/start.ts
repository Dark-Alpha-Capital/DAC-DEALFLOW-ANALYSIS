import { createStart } from "@tanstack/react-start";
import { neonPoolRequestMiddleware } from "@/middleware/neon-pool.middleware";

export const startInstance = createStart(() => ({
  requestMiddleware: [neonPoolRequestMiddleware],
}));
