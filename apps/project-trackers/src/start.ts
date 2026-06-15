import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import {
  d1FunctionMiddleware,
  d1RequestMiddleware,
} from "@/middleware/d1-pool.middleware";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, d1RequestMiddleware],
  functionMiddleware: [d1FunctionMiddleware],
}));
