import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBitrixWidgetDealId } from "@/hooks/use-bitrix-widget-deal-id";
import { loadBitrixScreenWidgetPostContext } from "@/lib/server/bitrix-screen-widget-post";
import { extractDealIdFromReferrer } from "@/lib/bitrix-widget-client";

const searchSchema = z.object({
  dealId: z.string().min(1).optional(),
  memberId: z.string().optional(),
  expiresAt: z.coerce.number().int().positive().optional(),
  authSig: z.string().optional(),
  authId: z.string().optional(),
  appSid: z.string().optional(),
  domain: z.string().optional(),
});

export const Route = createFileRoute(
  "/_public/deal-opportunities/screen-bitrix",
)({
  validateSearch: (search: Record<string, unknown>) => {
    const mapped = {
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
    return searchSchema.parse(mapped);
  },
  head: () => ({
    meta: [{ title: "Bitrix screening widget — Dark Alpha Capital" }],
  }),
  loader: async () => loadBitrixScreenWidgetPostContext(),
  component: BitrixScreeningWidgetPage,
});

function BitrixScreeningWidgetPage() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const { effectiveDealId, debugPayload } = useBitrixWidgetDealId({
    searchDealId: search.dealId,
    loader: loaderData,
  });

  const hasSignedAuth = Boolean(
    search.memberId && search.expiresAt && search.authSig,
  );
  const hasBitrixAuth = Boolean(search.authId && search.domain);
  const hasAppSidAuth = Boolean(search.appSid && search.domain);
  const authMode = hasSignedAuth
    ? "signed-auth"
    : hasBitrixAuth
      ? "bitrix-auth"
      : hasAppSidAuth
        ? "appsid-auth"
        : "missing-auth";

  const href = typeof window !== "undefined" ? window.location.href : "";
  const rawQuery =
    typeof window !== "undefined"
      ? Object.fromEntries(new URLSearchParams(window.location.search).entries())
      : {};

  const fullDebug = useMemo(
    () => ({
      href,
      rawQueryParams: rawQuery,
      normalizedParams: search,
      authMode,
      dealIdFromReferrer: extractDealIdFromReferrer(),
      ...debugPayload,
      checks: {
        hasDealId: Boolean(effectiveDealId),
        hasSignedAuth,
        hasBitrixAuth,
        hasAppSidAuth,
      },
    }),
    [
      href,
      rawQuery,
      search,
      authMode,
      debugPayload,
      effectiveDealId,
      hasSignedAuth,
      hasBitrixAuth,
      hasAppSidAuth,
    ],
  );

  if (!effectiveDealId) {
    return (
      <section className="mx-auto w-full max-w-2xl p-4">
        <Alert>
          <AlertTitle>Missing deal context</AlertTitle>
          <AlertDescription>
            Open this page from a Bitrix deal widget, or add{" "}
            <code className="text-xs">dealId</code> to the URL for local testing.
          </AlertDescription>
        </Alert>
        <details className="bg-card mt-3 rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Debug context
          </summary>
          <pre className="mt-2 max-h-[50vh] overflow-auto text-xs whitespace-pre-wrap">
            {JSON.stringify(fullDebug, null, 2)}
          </pre>
        </details>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-3 p-2">
      <BitrixScreeningWidgetWorkspace
        dealId={effectiveDealId}
        memberId={search.memberId}
        expiresAt={search.expiresAt}
        authSig={search.authSig}
        authId={search.authId}
        appSid={search.appSid}
        domain={search.domain}
      />
      {import.meta.env.DEV ? (
        <details className="bg-muted/30 rounded-md border p-2 text-xs">
          <summary className="cursor-pointer font-medium">Debug</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(fullDebug, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
