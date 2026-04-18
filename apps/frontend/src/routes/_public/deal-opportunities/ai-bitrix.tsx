import { createFileRoute } from "@tanstack/react-router";
import { AiBitrixInjectWorkspace } from "@/components/deal-opportunities/ai-bitrix-inject-workspace";
import { caller } from "@/trpc/server";

export const Route = createFileRoute("/_public/deal-opportunities/ai-bitrix")({
  head: () => ({
    meta: [{ title: "AI → Bitrix24 — Dark Alpha Capital" }],
  }),
  loader: async () => {
    const bitrixAiInjectContext =
      await caller.dealOpportunities.getBitrixAiInjectContext();
    return { bitrixAiInjectContext };
  },
  component: AiBitrixInjectPublicPage,
});

function AiBitrixInjectPublicPage() {
  const { bitrixAiInjectContext } = Route.useLoaderData();
  return (
    <section className="big-container block-space min-h-screen">
      <AiBitrixInjectWorkspace bitrixAiInjectContext={bitrixAiInjectContext} />
    </section>
  );
}
