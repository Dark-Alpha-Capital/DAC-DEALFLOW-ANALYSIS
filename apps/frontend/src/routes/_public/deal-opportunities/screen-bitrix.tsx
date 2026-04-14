import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const { initialDealId, bitrixPlacement, postKeys } = Route.useLoaderData();
  const [placementDealId, setPlacementDealId] = useState<string | undefined>(
    () => search.dealId ?? initialDealId ?? undefined,
  );
  const [bitrixFrontendDebug, setBitrixFrontendDebug] = useState<
    Record<string, unknown>
  >({});

  const extractDealIdFromReferrer = (): string | undefined => {
    if (typeof document === "undefined") return undefined;
    const ref = document.referrer || "";
    if (!ref) return undefined;
    const direct = ref.match(/\/crm\/deal\/details\/(\d+)\//i);
    if (direct?.[1]) return direct[1];
    try {
      const u = new URL(ref);
      const any = u.searchParams.get("any") || "";
      const decoded = decodeURIComponent(any);
      const fromAny = decoded.match(/details\/(\d+)\//i);
      if (fromAny?.[1]) return fromAny[1];
    } catch {
      // ignore parse issues
    }
    return undefined;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bx = window.BX24;

    const baseDebug: Record<string, unknown> = {
      hasBX24: Boolean(bx),
      topLevelWindowEqualsSelf:
        typeof window !== "undefined" ? window.top === window.self : null,
      documentReferrer:
        typeof document !== "undefined" ? document.referrer || null : null,
      locationSearch: window.location.search,
      locationHash: window.location.hash,
    };

    const resolveDealIdFromPlacementPayload = (info: unknown) => {
      const rec = info as Record<string, unknown> | null | undefined;
      const opts =
        (rec?.options as Record<string, unknown> | undefined) ??
        (rec?.placementOptions as Record<string, unknown> | undefined);
      const rawId =
        opts?.ID ??
        opts?.id ??
        opts?.ENTITY_ID ??
        opts?.entityId ??
        rec?.ID ??
        rec?.id;
      return rawId != null && String(rawId).trim()
        ? String(rawId).trim()
        : undefined;
    };

    const runPlacement = () => {
      if (!bx) {
        setBitrixFrontendDebug(baseDebug);
        return;
      }

      let nextDebug: Record<string, unknown> = {
        ...baseDebug,
        bx24Keys: Object.keys(bx),
        hasPlacementInfo: typeof bx.placement?.info === "function",
        hasPlacementGetOptions: typeof bx.placement?.getOptions === "function",
        hasGetAuth: typeof bx.getAuth === "function",
        hasGetPlacement: typeof bx.getPlacement === "function",
        hasGetLang: typeof bx.getLang === "function",
      };

      try {
        if (typeof bx.getAuth === "function") {
          nextDebug = { ...nextDebug, bx24GetAuth: bx.getAuth() };
        }
      } catch (error) {
        nextDebug = {
          ...nextDebug,
          bx24GetAuthError:
            error instanceof Error ? error.message : String(error),
        };
      }

      try {
        if (typeof bx.getPlacement === "function") {
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
        if (typeof bx.getLang === "function") {
          nextDebug = { ...nextDebug, bx24GetLang: bx.getLang() };
        }
      } catch (error) {
        nextDebug = {
          ...nextDebug,
          bx24GetLangError:
            error instanceof Error ? error.message : String(error),
        };
      }

      const applyPlacementInfo = (info: unknown) => {
        const fromBx = resolveDealIdFromPlacementPayload(info);
        const hasExplicit = Boolean(search.dealId) || Boolean(initialDealId);
        if (!hasExplicit && fromBx) {
          setPlacementDealId(fromBx);
        } else if (!hasExplicit) {
          const fromReferrer = extractDealIdFromReferrer();
          if (fromReferrer) {
            setPlacementDealId(fromReferrer);
          }
        }
        setBitrixFrontendDebug((prev) => ({
          ...prev,
          ...nextDebug,
          bx24PlacementInfo: info ?? null,
        }));
      };

      try {
        if (typeof bx.placement?.getOptions === "function") {
          applyPlacementInfo({ options: bx.placement.getOptions() });
          return;
        }

        if (typeof bx.placement?.info === "function") {
          bx.placement.info((info: unknown) => {
            applyPlacementInfo(info);
          });
          return;
        }

        if (!search.dealId && !initialDealId) {
          const fromReferrer = extractDealIdFromReferrer();
          if (fromReferrer) {
            setPlacementDealId(fromReferrer);
          }
        }
        setBitrixFrontendDebug(nextDebug);
      } catch (error) {
        setBitrixFrontendDebug({
          ...nextDebug,
          bx24PlacementInfoError:
            error instanceof Error ? error.message : String(error),
        });
      }
    };

    if (bx && typeof bx.init === "function") {
      bx.init(() => runPlacement());
    } else {
      runPlacement();
    }

    if (search.dealId) {
      setPlacementDealId(search.dealId);
    } else if (initialDealId) {
      setPlacementDealId(initialDealId);
    }
  }, [search.dealId, initialDealId]);

  const href = typeof window !== "undefined" ? window.location.href : "";
  const rawParams =
    typeof window !== "undefined"
      ? Object.fromEntries(
          new URLSearchParams(window.location.search).entries(),
        )
      : {};
  const hasSignedAuth = Boolean(
    search.memberId && search.expiresAt && search.authSig,
  );
  const hasBitrixAuth = Boolean(search.authId && search.domain);
  const hasAppSidAuth = Boolean(search.appSid && search.domain);
  const effectiveDealId =
    placementDealId ?? search.dealId ?? initialDealId ?? undefined;
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
      serverPostKeys: postKeys,
      serverPlacement: bitrixPlacement,
      serverInitialDealId: initialDealId,
      effectiveDealId,
      dealIdFromReferrer: extractDealIdFromReferrer(),
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
      postKeys,
      bitrixPlacement,
      initialDealId,
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
