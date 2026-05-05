import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AlertCircle, TriangleAlert } from "lucide-react";
import { IcScorerWorkspace } from "@/components/deal-opportunities/ic-scorer-workspace";
import { NoDealLoadedCard } from "@/components/deal-opportunities/NoDealLoadedCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBitrixWidgetDealId } from "@/hooks/use-bitrix-widget-deal-id";
import {
  bitrixWidgetSearchSchema,
  hasWidgetBootstrapAuth,
  mapBitrixWidgetSearch,
  buildBootstrapInput,
  type BitrixWidgetSearch,
} from "@/lib/bitrix-widget-shared";
import type {
  IcScorerBootstrapInput,
  IcScorerBootstrapPayload,
  IcScorerBootstrapPrefetchHint,
} from "@/lib/ic-scorer-bootstrap-types";
import { loadIcScorerBootstrapData } from "@/lib/server/load-ic-scorer-bootstrap";
import {
  loadBitrixScreenWidgetPostContext,
  type BitrixScreenWidgetPostContext,
} from "@/lib/server/bitrix-screen-widget-post";

const IC_SCORER_LOG = "[ic-scorer route]";

export type IcScorerRouteLoaderData = BitrixScreenWidgetPostContext & {
  prefetchedBootstrap: IcScorerBootstrapPayload | null;
  bootstrapPrefetchInput: IcScorerBootstrapInput | null;
  bootstrapPrefetchHint: IcScorerBootstrapPrefetchHint;
};

export const Route = createFileRoute("/_public/deal-opportunities/ic-scorer")({
  validateSearch: (search: Record<string, unknown>) =>
    bitrixWidgetSearchSchema.parse(mapBitrixWidgetSearch(search)),
  head: () => ({
    meta: [{ title: "IC Readiness scorer — Dark Alpha Capital" }],
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<IcScorerRouteLoaderData> => {
    const postCtx = await loadBitrixScreenWidgetPostContext();
    const s = deps.search;
    const urlHasAuth = hasWidgetBootstrapAuth(s);
    const postHasAuth =
      Boolean(postCtx.postAuth.authId && postCtx.postAuth.domain) ||
      Boolean(postCtx.postAuth.appSid && postCtx.postAuth.domain);
    const dealIdForPrefetch =
      s.dealId?.trim() || postCtx.initialDealId?.trim() || "";

    if (!dealIdForPrefetch || (!urlHasAuth && !postHasAuth)) {
      const reason = !dealIdForPrefetch ? "missing_dealId" : "missing_widget_auth";
      console.info(IC_SCORER_LOG, "bootstrap prefetch skipped", {
        reason,
        dealIdInSearch: Boolean(s.dealId?.trim()),
        dealIdFromBitrixPost: Boolean(postCtx.initialDealId?.trim()),
        hasAuth: urlHasAuth || postHasAuth,
      });
      return {
        ...postCtx,
        prefetchedBootstrap: null,
        bootstrapPrefetchInput: null,
        bootstrapPrefetchHint: {
          kind: "skipped",
          reason,
          hasAuth: urlHasAuth || postHasAuth,
          dealIdFromBitrixPost: Boolean(postCtx.initialDealId?.trim()),
          dealIdInSearch: Boolean(s.dealId?.trim()),
        },
      };
    }

    const bootstrapPrefetchInput = buildBootstrapInput(
      s,
      dealIdForPrefetch,
    ) as IcScorerBootstrapInput;

    if (!urlHasAuth) {
      bootstrapPrefetchInput.memberId =
        bootstrapPrefetchInput.memberId || postCtx.postAuth.memberId || undefined;
      bootstrapPrefetchInput.authId =
        bootstrapPrefetchInput.authId || postCtx.postAuth.authId || undefined;
      bootstrapPrefetchInput.appSid =
        bootstrapPrefetchInput.appSid || postCtx.postAuth.appSid || undefined;
      bootstrapPrefetchInput.domain =
        bootstrapPrefetchInput.domain || postCtx.postAuth.domain || undefined;
    }

    try {
      const prefetchedBootstrap = await loadIcScorerBootstrapData({
        data: bootstrapPrefetchInput,
      });
      return {
        ...postCtx,
        prefetchedBootstrap,
        bootstrapPrefetchInput,
        bootstrapPrefetchHint: { kind: "ready" },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(IC_SCORER_LOG, "bootstrap prefetch failed", {
        dealId: bootstrapPrefetchInput.dealId,
        error: msg,
      });
      return {
        ...postCtx,
        prefetchedBootstrap: null,
        bootstrapPrefetchInput: null,
        bootstrapPrefetchHint: { kind: "error", message: msg },
      };
    }
  },
  component: IcScorerPage,
});

function PrefetchHintAlerts({ hint }: { hint: IcScorerBootstrapPrefetchHint }) {
  if (hint.kind === "skipped" && hint.reason === "missing_dealId" && hint.hasAuth) {
    return (
      <div className="px-6 pt-6">
        <Alert className="border-amber-500/40 bg-amber-500/5 text-left">
          <TriangleAlert
            className="size-4 text-amber-600 dark:text-amber-500"
            aria-hidden
          />
          <AlertTitle className="text-amber-950 dark:text-amber-100">
            Widget auth OK — deal ID missing on first load
          </AlertTitle>
          <AlertDescription className="text-sm leading-relaxed text-amber-950/90 dark:text-amber-50/90">
            The server did not see a deal ID in the URL or Bitrix POST body when
            this page loaded (common after{" "}
            <span className="text-foreground font-medium">dev hot reload</span>{" "}
            or opening a bookmarked URL without{" "}
            <code className="font-mono text-xs">dealId</code>). Open the scorer
            from inside the Bitrix deal tab, add{" "}
            <code className="font-mono text-xs">?dealId=…</code> to the URL, or
            wait for Bitrix to expose the placement — then reload.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  if (hint.kind === "skipped" && hint.reason === "missing_widget_auth") {
    return (
      <div className="px-6 pt-6">
        <Alert variant="destructive" className="text-left">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Missing widget authentication</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            Add signed params (memberId, expiresAt, authSig) or AUTH_ID + DOMAIN
            (or APP_SID + DOMAIN) as when embedding from Bitrix24.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  if (hint.kind === "error") {
    return (
      <div className="px-6 pt-6">
        <Alert variant="destructive" className="text-left">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Could not prefetch deal from Bitrix</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            {hint.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return null;
}

function IcScorerPage() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const { effectiveDealId, workspaceInput } = useBitrixWidgetDealId(
    search as BitrixWidgetSearch,
    loaderData,
  );

  const { postAuth } = loaderData;

  const resolvedWorkspaceInput = useMemo(() => {
    return {
      memberId: workspaceInput.memberId ?? postAuth.memberId ?? undefined,
      expiresAt: workspaceInput.expiresAt,
      authSig: workspaceInput.authSig,
      authId: workspaceInput.authId ?? postAuth.authId ?? undefined,
      appSid: workspaceInput.appSid ?? postAuth.appSid ?? undefined,
      domain: workspaceInput.domain ?? postAuth.domain ?? undefined,
    };
  }, [workspaceInput, postAuth]);

  useEffect(() => {
    const prefetched = loaderData.prefetchedBootstrap;
    console.info(IC_SCORER_LOG, "client mount / update", {
      effectiveDealId: effectiveDealId ?? null,
      searchDealId: (search as BitrixWidgetSearch).dealId ?? null,
      prefetchedDealId: prefetched?.dealId ?? null,
      prefetchedTitle: prefetched?.title ?? null,
      bootstrapFromLoader: Boolean(prefetched),
    });
  }, [effectiveDealId, search, loaderData.prefetchedBootstrap]);

  if (!effectiveDealId) {
    return (
      <NoDealLoadedCard description="The IC Readiness scorer needs a Bitrix deal ID. It is normally opened from inside Bitrix24 (placement on a deal), which passes the deal and auth in the URL.">
        <PrefetchHintAlerts hint={loaderData.bootstrapPrefetchHint} />
      </NoDealLoadedCard>
    );
  }

  return (
    <main>
      <IcScorerWorkspace
        dealId={effectiveDealId}
        {...resolvedWorkspaceInput}
        loaderBootstrap={loaderData.prefetchedBootstrap}
        loaderBootstrapInput={loaderData.bootstrapPrefetchInput}
        bootstrapPrefetchHint={loaderData.bootstrapPrefetchHint}
      />
    </main>
  );
}
