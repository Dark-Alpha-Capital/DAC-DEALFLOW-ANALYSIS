import { createStart } from "@tanstack/react-start";
import {
  neonPoolFunctionMiddleware,
  neonPoolRequestMiddleware,
} from "@/middleware/neon-pool.middleware";

export const startInstance = createStart(() => ({
  requestMiddleware: [neonPoolRequestMiddleware],
  functionMiddleware: [neonPoolFunctionMiddleware],
}));
