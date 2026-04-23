import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  AlertCircle,
  CircleHelp,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { z } from "zod";
import { IcScorerWorkspace } from "@/components/deal-opportunities/ic-scorer-workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBitrixWidgetDealId } from "@/hooks/use-bitrix-widget-deal-id";
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

export type IcScorerRouteLoaderData = BitrixScreenWidgetPostContext & {
  prefetchedBootstrap: IcScorerBootstrapPayload | null;
  bootstrapPrefetchInput: IcScorerBootstrapInput | null;
  bootstrapPrefetchHint: IcScorerBootstrapPrefetchHint;
};

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

function hasWidgetBootstrapAuth(s: z.infer<typeof searchSchema>): boolean {
  return Boolean(
    (s.memberId && s.expiresAt && s.authSig) ||
    (s.authId && s.domain) ||
    (s.appSid && s.domain),
  );
}

export const Route = createFileRoute("/_public/deal-opportunities/ic-scorer")({
  validateSearch: (search: Record<string, unknown>) =>
    searchSchema.parse(mapSearch(search)),
  head: () => ({
    meta: [{ title: "IC Readiness scorer — Dark Alpha Capital" }],
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<IcScorerRouteLoaderData> => {
    const postCtx = await loadBitrixScreenWidgetPostContext();
    const s = deps.search;
    const authOk = hasWidgetBootstrapAuth(s);
    const dealIdInSearch = Boolean(s.dealId?.trim());
    const dealIdFromBitrixPost = Boolean(postCtx.initialDealId?.trim());
    const dealIdForPrefetch =
      s.dealId?.trim() || postCtx.initialDealId?.trim() || "";

    if (!dealIdForPrefetch || !authOk) {
      const reason = !dealIdForPrefetch
        ? "missing_dealId"
        : "missing_widget_auth";
      console.info(IC_SCORER_LOG, "bootstrap prefetch skipped", {
        reason,
        dealIdInSearch,
        dealIdFromBitrixPost,
        hasAuth: authOk,
      });
      return {
        ...postCtx,
        prefetchedBootstrap: null,
        bootstrapPrefetchInput: null,
        bootstrapPrefetchHint: {
          kind: "skipped",
          reason,
          hasAuth: authOk,
          dealIdFromBitrixPost,
          dealIdInSearch,
        },
      };
    }

    const bootstrapPrefetchInput: IcScorerBootstrapInput = {
      dealId: dealIdForPrefetch,
      memberId: s.memberId,
      expiresAt: s.expiresAt,
      authSig: s.authSig,
      authId: s.authId,
      appSid: s.appSid,
      domain: s.domain,
    };
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

function IcScorerPage() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const { effectiveDealId, workspaceInput } = useBitrixWidgetDealId(
    search,
    loaderData,
  );

  useEffect(() => {
    const prefetched = loaderData.prefetchedBootstrap;
    console.info(IC_SCORER_LOG, "client mount / update", {
      effectiveDealId: effectiveDealId ?? null,
      searchDealId: search.dealId ?? null,
      prefetchedDealId: prefetched?.dealId ?? null,
      prefetchedTitle: prefetched?.title ?? null,
      bootstrapFromLoader: Boolean(prefetched),
    });
  }, [effectiveDealId, search.dealId, loaderData.prefetchedBootstrap]);

  if (!effectiveDealId) {
    const hint = loaderData.bootstrapPrefetchHint;
    return (
      <main className="bg-muted/40 flex min-h-dvh flex-col items-center justify-center p-4 sm:p-8">
        <Card className="border-border/80 w-full max-w-lg shadow-md">
          {hint.kind === "skipped" &&
            hint.reason === "missing_dealId" &&
            hint.hasAuth && (
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
                    The server did not see a deal ID in the URL or Bitrix POST
                    body when this page loaded (common after{" "}
                    <span className="text-foreground font-medium">
                      dev hot reload
                    </span>{" "}
                    or opening a bookmarked URL without{" "}
                    <code className="font-mono text-xs">dealId</code>). Open the
                    scorer from inside the Bitrix deal tab, add{" "}
                    <code className="font-mono text-xs">?dealId=…</code> to the
                    URL, or wait for Bitrix to expose the placement — then
                    reload.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          {hint.kind === "skipped" && hint.reason === "missing_widget_auth" && (
            <div className="px-6 pt-6">
              <Alert variant="destructive" className="text-left">
                <AlertCircle className="size-4" aria-hidden />
                <AlertTitle>Missing widget authentication</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  Add signed params (memberId, expiresAt, authSig) or AUTH_ID +
                  DOMAIN (or APP_SID + DOMAIN) as when embedding from Bitrix24.
                </AlertDescription>
              </Alert>
            </div>
          )}
          {hint.kind === "error" && (
            <div className="px-6 pt-6">
              <Alert variant="destructive" className="text-left">
                <AlertCircle className="size-4" aria-hidden />
                <AlertTitle>Could not prefetch deal from Bitrix</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  {hint.message}
                </AlertDescription>
              </Alert>
            </div>
          )}
          <CardHeader className="items-center space-y-3 pb-2 text-center">
            <div
              className="bg-primary/12 text-primary flex size-14 items-center justify-center rounded-full"
              aria-hidden
            >
              <CircleHelp className="size-7" strokeWidth={1.75} />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                No deal is loaded yet
              </CardTitle>
              <CardDescription className="text-muted-foreground max-w-prose text-[15px] leading-relaxed text-pretty">
                The IC Readiness scorer needs a Bitrix deal ID. It is normally
                opened from inside Bitrix24 (placement on a deal), which passes
                the deal and auth in the URL.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4 text-sm leading-relaxed">
            <div className="space-y-2">
              <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                What you can do
              </p>
              <ul className="marker:text-primary list-inside list-disc space-y-1.5 pl-0.5">
                <li>
                  <span className="text-foreground font-medium">
                    In Bitrix24:
                  </span>{" "}
                  open the scorer from the deal card or menu so the app loads
                  with the correct deal.
                </li>
                <li>
                  <span className="text-foreground font-medium">
                    Local / manual test:
                  </span>{" "}
                  add a deal id to the address bar, for example{" "}
                  <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                    ?dealId=123
                  </code>
                  , plus the same auth query params your environment expects.
                </li>
                <li>
                  <span className="text-foreground font-medium">
                    After it worked once:
                  </span>{" "}
                  this tab saves the last deal in{" "}
                  <span className="text-foreground">session storage</span>. Use
                  reload below if the page opened blank but you had loaded a
                  deal earlier in the same tab.
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2 sm:pt-4">
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={reloadPage}
              className="h-12 w-full cursor-pointer gap-2 text-base font-semibold shadow-sm sm:h-11"
            >
              <RefreshCw className="size-5 shrink-0" aria-hidden />
              Reload page
            </Button>
            <p className="text-muted-foreground text-center text-xs leading-snug">
              Tip: if you pasted a long widget URL, check that{" "}
              <code className="text-foreground font-mono">dealId</code> (or{" "}
              <code className="text-foreground font-mono">DEAL_ID</code>) is
              present and not truncated.
            </p>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <IcScorerWorkspace
        dealId={effectiveDealId}
        {...workspaceInput}
        loaderBootstrap={loaderData.prefetchedBootstrap}
        loaderBootstrapInput={loaderData.bootstrapPrefetchInput}
        bootstrapPrefetchHint={loaderData.bootstrapPrefetchHint}
      />
    </main>
  );
}
