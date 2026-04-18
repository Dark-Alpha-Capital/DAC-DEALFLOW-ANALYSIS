import { createServerFn } from "@tanstack/react-start";
import { caller } from "@/trpc/server";

export const loadBitrixAiInjectRouteData = createServerFn({ method: "GET" }).handler(
  async () => {
    const bitrixAiInjectContext =
      await caller.dealOpportunities.getBitrixAiInjectContext();
    return { bitrixAiInjectContext };
  },
);
