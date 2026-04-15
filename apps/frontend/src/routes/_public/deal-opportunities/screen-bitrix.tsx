import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";
import { useBitrixWidgetDealId } from "@/hooks/use-bitrix-widget-deal-id";
import { loadBitrixScreenWidgetPostContext } from "@/lib/server/bitrix-screen-widget-post";

const searchSchema = z.object({
  dealId: z.string().min(1).optional(),
  memberId: z.string().optional(),
  expiresAt: z.coerce.number().int().positive().optional(),
  authSig: z.string().optional(),
  authId: z.string().optional(),
  appSid: z.string().optional(),
  domain: z.string().optional(),
});

function mapSearch(search: Record<string, unknown>) {
  return {
    dealId:
      typeof search.dealId === "string"
        ? search.dealId
        : typeof search.DEAL_ID === "string"
          ? search.DEAL_ID
          : undefined,
    memberId:
      typeof search.memberId === "string"
        ? search.memberId
        : typeof search.MEMBER_ID === "string"
          ? search.MEMBER_ID
          : undefined,
    expiresAt:
      search.expiresAt ??
      (typeof search.EXPIRES_AT === "string"
        ? Number(search.EXPIRES_AT)
        : undefined),
    authSig:
      typeof search.authSig === "string"
        ? search.authSig
        : typeof search.AUTH_SIG === "string"
          ? search.AUTH_SIG
          : undefined,
    authId:
      typeof search.authId === "string"
        ? search.authId
        : typeof search.AUTH_ID === "string"
          ? search.AUTH_ID
          : undefined,
    appSid:
      typeof search.appSid === "string"
        ? search.appSid
        : typeof search.APP_SID === "string"
          ? search.APP_SID
          : undefined,
    domain:
      typeof search.domain === "string"
        ? search.domain
        : typeof search.DOMAIN === "string"
          ? search.DOMAIN
          : undefined,
  };
}

export const Route = createFileRoute(
  "/_public/deal-opportunities/screen-bitrix",
)({
  validateSearch: (search: Record<string, unknown>) =>
    searchSchema.parse(mapSearch(search)),
  head: () => ({
    meta: [{ title: "Bitrix screening widget — Dark Alpha Capital" }],
  }),
  loader: async () => loadBitrixScreenWidgetPostContext(),
  component: BitrixScreeningWidgetPage,
});

function BitrixScreeningWidgetPage() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();

  console.log("loaderData", loaderData);

  const { effectiveDealId } = useBitrixWidgetDealId({
    searchDealId: search.dealId,
    loader: loaderData,
  });

  if (!effectiveDealId) {
    return (
      <main className="text-muted-foreground mx-auto max-w-md p-6 text-sm">
        <p>
          No deal id. Open this URL from the Bitrix widget, or append{" "}
          <code className="text-foreground">?dealId=123</code> for local
          testing.
        </p>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-dvh">
      <BitrixScreeningWidgetWorkspace
        dealId={effectiveDealId}
        memberId={search.memberId}
        expiresAt={search.expiresAt}
        authSig={search.authSig}
        authId={search.authId}
        appSid={search.appSid}
        domain={search.domain}
      />
    </main>
  );
}
