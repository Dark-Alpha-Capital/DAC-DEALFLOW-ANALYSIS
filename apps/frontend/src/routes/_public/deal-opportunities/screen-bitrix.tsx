import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  component: BitrixScreeningWidgetPage,
});

function BitrixScreeningWidgetPage() {
  const search = Route.useSearch();
  const [placementDealId, setPlacementDealId] = useState<string | undefined>(
    search.dealId,
  );
  const [bitrixFrontendDebug, setBitrixFrontendDebug] = useState<
    Record<string, unknown>
  >({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bx = (window as Window & { BX24?: any }).BX24;

    const baseDebug: Record<string, unknown> = {
      hasBX24: Boolean(bx),
      topLevelWindowEqualsSelf:
        typeof window !== "undefined" ? window.top === window.self : null,
      documentReferrer:
        typeof document !== "undefined" ? document.referrer || null : null,
      locationSearch: window.location.search,
      locationHash: window.location.hash,
    };

    if (!bx) {
      setBitrixFrontendDebug(baseDebug);
      return;
    }

    let nextDebug: Record<string, unknown> = {
      ...baseDebug,
      bx24Keys: Object.keys(bx),
      hasPlacementInfo: Boolean(bx?.placement?.info),
      hasGetAuth: typeof bx?.getAuth === "function",
      hasGetPlacement: typeof bx?.getPlacement === "function",
      hasGetLang: typeof bx?.getLang === "function",
    };

    try {
      if (typeof bx?.getAuth === "function") {
        nextDebug = { ...nextDebug, bx24GetAuth: bx.getAuth() };
      }
    } catch (error) {
      nextDebug = {
        ...nextDebug,
        bx24GetAuthError: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      if (typeof bx?.getPlacement === "function") {
        nextDebug = { ...nextDebug, bx24GetPlacement: bx.getPlacement() };
      }
    } catch (error) {
      nextDebug = {
        ...nextDebug,
        bx24GetPlacementError:
          error instanceof Error ? error.message : String(error),
      };
    }

    try {
      if (typeof bx?.getLang === "function") {
        nextDebug = { ...nextDebug, bx24GetLang: bx.getLang() };
      }
    } catch (error) {
      nextDebug = {
        ...nextDebug,
        bx24GetLangError: error instanceof Error ? error.message : String(error),
      };
    }

    if (typeof bx?.placement?.info === "function") {
      try {
        bx.placement.info((info: any) => {
          const rawId =
            info?.options?.ID ??
            info?.options?.id ??
            info?.options?.ENTITY_ID ??
            info?.placementOptions?.ID ??
            info?.placementOptions?.id ??
            info?.placementOptions?.ENTITY_ID;
          if (!search.dealId && rawId != null && String(rawId).trim()) {
            setPlacementDealId(String(rawId).trim());
          }
          setBitrixFrontendDebug((prev) => ({
            ...prev,
            ...nextDebug,
            bx24PlacementInfo: info ?? null,
          }));
        });
      } catch (error) {
        setBitrixFrontendDebug({
          ...nextDebug,
          bx24PlacementInfoError: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      setBitrixFrontendDebug(nextDebug);
    }

    if (search.dealId) {
      setPlacementDealId(search.dealId);
    }
  }, [search.dealId]);

  const href = typeof window !== "undefined" ? window.location.href : "";
  const rawParams =
    typeof window !== "undefined"
      ? Object.fromEntries(new URLSearchParams(window.location.search).entries())
      : {};
  const hasSignedAuth = Boolean(
    search.memberId && search.expiresAt && search.authSig,
  );
  const hasBitrixAuth = Boolean(search.authId && search.domain);
  const hasAppSidAuth = Boolean(search.appSid && search.domain);
  const effectiveDealId = placementDealId ?? search.dealId;
  const missingCore = effectiveDealId ? [] : ["dealId"];
  const authHint = hasSignedAuth
    ? "signed-auth"
    : hasBitrixAuth
      ? "bitrix-auth"
      : hasAppSidAuth
        ? "appsid-auth"
        : "missing-auth";

  const debugPayload = useMemo(
    () => ({
    href,
    rawQueryParams: rawParams,
    normalizedParams: search,
    effectiveDealId,
    bitrixFrontend: bitrixFrontendDebug,
    authMode: authHint,
    missingCore,
    checks: {
      hasDealId: Boolean(effectiveDealId),
      hasSignedAuth,
      hasBitrixAuth,
      hasAppSidAuth,
    },
    }),
    [
      href,
      rawParams,
      search,
      effectiveDealId,
      bitrixFrontendDebug,
      authHint,
      missingCore,
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
            Open this page from a Bitrix deal widget, or provide{" "}
            <code>dealId</code> in the URL during local development.
          </AlertDescription>
        </Alert>
        <details className="bg-card mt-3 rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Debug context
          </summary>
          <pre className="mt-2 overflow-auto text-xs whitespace-pre-wrap">
            {JSON.stringify(debugPayload, null, 2)}
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
      <details className="bg-card rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Debug context
        </summary>
        <pre className="mt-2 overflow-auto text-xs whitespace-pre-wrap">
          {JSON.stringify(debugPayload, null, 2)}
        </pre>
      </details>
    </section>
  );
}
