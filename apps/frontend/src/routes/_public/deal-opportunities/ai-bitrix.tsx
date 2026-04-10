import { createFileRoute } from "@tanstack/react-router";
import { AiBitrixInjectWorkspace } from "@/components/deal-opportunities/ai-bitrix-inject-workspace";

export const Route = createFileRoute("/_public/deal-opportunities/ai-bitrix")({
  head: () => ({
    meta: [{ title: "AI → Bitrix24 — Dark Alpha Capital" }],
  }),
  component: AiBitrixInjectPublicPage,
});

function AiBitrixInjectPublicPage() {
  return (
    <section className="big-container block-space min-h-screen">
      <AiBitrixInjectWorkspace />
    </section>
  );
}
