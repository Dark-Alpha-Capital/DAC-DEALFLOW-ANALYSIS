import { createStart } from "@tanstack/react-start";
import { bitrixAiWidgetGateRequestMiddleware } from "@/middleware/bitrix-ai-widget-gate.middleware";
import {
  d1FunctionMiddleware,
  d1RequestMiddleware,
} from "@/middleware/d1-pool.middleware";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    bitrixAiWidgetGateRequestMiddleware,
    d1RequestMiddleware,
  ],
  functionMiddleware: [d1FunctionMiddleware],
}));
