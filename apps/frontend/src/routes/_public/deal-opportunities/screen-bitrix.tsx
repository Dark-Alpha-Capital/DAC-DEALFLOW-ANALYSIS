import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";

const searchSchema = z.object({
  dealId: z.string().min(1),
  memberId: z.string().min(1),
  expiresAt: z.coerce.number().int().positive(),
  authSig: z.string().min(1),
  domain: z.string().optional(),
});

export const Route = createFileRoute(
  "/_public/deal-opportunities/screen-bitrix",
)({
  validateSearch: (search: Record<string, unknown>) =>
    searchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Bitrix screening widget — Dark Alpha Capital" }],
  }),
  component: BitrixScreeningWidgetPage,
});

function BitrixScreeningWidgetPage() {
  const search = Route.useSearch();
  return (
    <BitrixScreeningWidgetWorkspace
      dealId={search.dealId}
      memberId={search.memberId}
      expiresAt={search.expiresAt}
      authSig={search.authSig}
      domain={search.domain}
    />
  );
}
