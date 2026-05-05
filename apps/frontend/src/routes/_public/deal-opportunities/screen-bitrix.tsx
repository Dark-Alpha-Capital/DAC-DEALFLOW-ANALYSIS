import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";
import { NoDealLoadedCard } from "@/components/deal-opportunities/NoDealLoadedCard";
import { useBitrixWidgetDealId } from "@/hooks/use-bitrix-widget-deal-id";
import {
  bitrixWidgetSearchSchema,
  hasWidgetBootstrapAuth,
  mapBitrixWidgetSearch,
  buildBootstrapInput,
  type BitrixWidgetSearch,
} from "@/lib/bitrix-widget-shared";
import {
  loadBitrixScreeningWidgetBootstrapData,
  type BitrixScreeningWidgetBootstrapInput,
  type BitrixScreeningWidgetBootstrapPayload,
} from "@/lib/server/load-bitrix-screening-widget-bootstrap";
import {
  loadBitrixScreenWidgetPostContext,
  type BitrixScreenWidgetPostContext,
} from "@/lib/server/bitrix-screen-widget-post";

export type BitrixScreeningWidgetRouteLoaderData =
  BitrixScreenWidgetPostContext & {
    prefetchedBootstrap: BitrixScreeningWidgetBootstrapPayload | null;
    bootstrapPrefetchInput: BitrixScreeningWidgetBootstrapInput | null;
  };

export const Route = createFileRoute(
  "/_public/deal-opportunities/screen-bitrix",
)({
  validateSearch: (search: Record<string, unknown>) =>
    bitrixWidgetSearchSchema.parse(mapBitrixWidgetSearch(search)),
  head: () => ({
    meta: [{ title: "Bitrix screening widget — Dark Alpha Capital" }],
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<BitrixScreeningWidgetRouteLoaderData> => {
    const postCtx = await loadBitrixScreenWidgetPostContext();
    const s = deps.search;
    const urlHasAuth = hasWidgetBootstrapAuth(s);
    const postHasAuth =
      Boolean(postCtx.postAuth.authId && postCtx.postAuth.domain) ||
      Boolean(postCtx.postAuth.appSid && postCtx.postAuth.domain);
    const dealId =
      s.dealId?.trim() || postCtx.initialDealId?.trim() || "";

    if (!dealId || (!urlHasAuth && !postHasAuth)) {
      return {
        ...postCtx,
        prefetchedBootstrap: null,
        bootstrapPrefetchInput: null,
      };
    }

    const bootstrapPrefetchInput = buildBootstrapInput(
      s,
      dealId,
    ) as BitrixScreeningWidgetBootstrapInput;

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
      const prefetchedBootstrap = await loadBitrixScreeningWidgetBootstrapData({
        data: bootstrapPrefetchInput,
      });
      return { ...postCtx, prefetchedBootstrap, bootstrapPrefetchInput };
    } catch {
      return {
        ...postCtx,
        prefetchedBootstrap: null,
        bootstrapPrefetchInput: null,
      };
    }
  },
  component: BitrixScreeningWidgetPage,
});

function BitrixScreeningWidgetPage() {
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

  if (!effectiveDealId) {
    return (
      <NoDealLoadedCard description="This screening widget needs a Bitrix deal ID. It is normally opened from inside Bitrix24 (placement on a deal), which passes the deal and auth in the URL." />
    );
  }

  return (
    <main>
      <BitrixScreeningWidgetWorkspace
        dealId={effectiveDealId}
        {...resolvedWorkspaceInput}
        loaderBootstrap={loaderData.prefetchedBootstrap}
        loaderBootstrapInput={loaderData.bootstrapPrefetchInput}
      />
    </main>
  );
}
