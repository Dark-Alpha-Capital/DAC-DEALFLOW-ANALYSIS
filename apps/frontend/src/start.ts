import { createStart } from "@tanstack/react-start";
import { bitrixAiWidgetGateRequestMiddleware } from "@/middleware/bitrix-ai-widget-gate.middleware";
import {
  neonPoolFunctionMiddleware,
  neonPoolRequestMiddleware,
} from "@/middleware/neon-pool.middleware";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    bitrixAiWidgetGateRequestMiddleware,
    neonPoolRequestMiddleware,
  ],
  functionMiddleware: [neonPoolFunctionMiddleware],
}));
