import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { z } from "zod";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";
import { Button } from "@/components/ui/button";
import { useBitrixWidgetDealId } from "@/hooks/use-bitrix-widget-deal-id";
import { loadBitrixScreenWidgetPostContext } from "@/lib/server/bitrix-screen-widget-post";

function reloadPage() {
  window.location.reload();
}

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

  const { effectiveDealId } = useBitrixWidgetDealId({
    searchDealId: search.dealId,
    loader: loaderData,
  });

  if (!effectiveDealId) {
    return (
      <main className="text-muted-foreground relative mx-auto max-w-md p-6 text-sm">
        <div className="absolute inset-e-0 top-0 p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reloadPage}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Reload
          </Button>
        </div>
        <p>
          No deal id. Open this URL from the Bitrix widget, or append{" "}
          <code className="text-foreground">?dealId=123</code> for local
          testing.
        </p>
      </main>
    );
  }

  return (
    <main className="bg-background relative min-h-dvh">
      <div className="absolute inset-e-0 top-0 z-10 p-2 md:p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={reloadPage}
          className="gap-1.5 shadow-sm"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Reload
        </Button>
      </div>
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
