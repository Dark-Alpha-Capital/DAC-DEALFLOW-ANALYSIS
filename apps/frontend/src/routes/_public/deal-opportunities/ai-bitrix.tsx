import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AiBitrixInjectWorkspace,
  type BitrixAiInjectContext,
} from "@/components/deal-opportunities/ai-bitrix-inject-workspace";
import { loadBitrixAiInjectRouteData } from "@/lib/server/load-bitrix-ai-inject-route-data";
import {
  bitrixWidgetSearchSchema,
  mapBitrixWidgetSearch,
  type BitrixWidgetSearch,
} from "@/lib/bitrix-widget-shared";
import {
  loadBitrixScreenWidgetPostContext,
  type BitrixScreenWidgetPostContext,
} from "@/lib/server/bitrix-screen-widget-post";

export type AiBitrixInjectRouteLoaderData = BitrixScreenWidgetPostContext & {
  bitrixAiInjectContext: BitrixAiInjectContext;
};

export const Route = createFileRoute("/_public/deal-opportunities/ai-bitrix")({
  validateSearch: (search: Record<string, unknown>) =>
    bitrixWidgetSearchSchema.parse(mapBitrixWidgetSearch(search)),
  head: () => ({
    meta: [{ title: "AI → Bitrix24 — Dark Alpha Capital" }],
  }),
  loader: async (): Promise<AiBitrixInjectRouteLoaderData> => {
    const [postCtx, routeData] = await Promise.all([
      loadBitrixScreenWidgetPostContext(),
      loadBitrixAiInjectRouteData(),
    ]);
    return { ...postCtx, ...routeData };
  },
  component: AiBitrixInjectPublicPage,
});

function AiBitrixInjectPublicPage() {
  const search = Route.useSearch() as BitrixWidgetSearch;
  const { bitrixAiInjectContext, postAuth } = Route.useLoaderData();
  const assignedByUserId = useMemo(() => {
    const raw = search.memberId?.trim() || postAuth.memberId || "";
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [postAuth.memberId, search.memberId]);

  return (
    <section className="big-container block-space min-h-screen">
      <AiBitrixInjectWorkspace
        bitrixAiInjectContext={bitrixAiInjectContext}
        assignedByUserId={assignedByUserId}
      />
    </section>
  );
}
