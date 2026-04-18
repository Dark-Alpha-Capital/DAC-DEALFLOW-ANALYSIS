import { createFileRoute } from "@tanstack/react-router";
import { CircleHelp, RefreshCw } from "lucide-react";
import { z } from "zod";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBitrixWidgetDealId } from "@/hooks/use-bitrix-widget-deal-id";
import {
  loadBitrixScreeningWidgetBootstrapData,
  type BitrixScreeningWidgetBootstrapInput,
  type BitrixScreeningWidgetBootstrapPayload,
} from "@/lib/server/load-bitrix-screening-widget-bootstrap";
import {
  loadBitrixScreenWidgetPostContext,
  type BitrixScreenWidgetPostContext,
} from "@/lib/server/bitrix-screen-widget-post";

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

export type BitrixScreeningWidgetRouteLoaderData =
  BitrixScreenWidgetPostContext & {
    prefetchedBootstrap: BitrixScreeningWidgetBootstrapPayload | null;
    bootstrapPrefetchInput: BitrixScreeningWidgetBootstrapInput | null;
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

export const Route = createFileRoute(
  "/_public/deal-opportunities/screen-bitrix",
)({
  validateSearch: (search: Record<string, unknown>) =>
    searchSchema.parse(mapSearch(search)),
  head: () => ({
    meta: [{ title: "Bitrix screening widget — Dark Alpha Capital" }],
  }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<BitrixScreeningWidgetRouteLoaderData> => {
    const postCtx = await loadBitrixScreenWidgetPostContext();
    const s = deps.search;
    if (!s.dealId?.trim() || !hasWidgetBootstrapAuth(s)) {
      return {
        ...postCtx,
        prefetchedBootstrap: null,
        bootstrapPrefetchInput: null,
      };
    }
    const bootstrapPrefetchInput: BitrixScreeningWidgetBootstrapInput = {
      dealId: s.dealId.trim(),
      memberId: s.memberId,
      expiresAt: s.expiresAt,
      authSig: s.authSig,
      authId: s.authId,
      appSid: s.appSid,
      domain: s.domain,
    };
    try {
      const prefetchedBootstrap = await loadBitrixScreeningWidgetBootstrapData({
        data: bootstrapPrefetchInput,
      });
      return {
        ...postCtx,
        prefetchedBootstrap,
        bootstrapPrefetchInput,
      };
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
    search,
    loaderData,
  );

  if (!effectiveDealId) {
    return (
      <main className="bg-muted/40 flex min-h-dvh flex-col items-center justify-center p-4 sm:p-8">
        <Card className="border-border/80 w-full max-w-lg shadow-md">
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
                This screening widget needs a Bitrix deal ID. It is normally
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
                  open the widget from the deal card or menu so the app loads
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
    <main className="">
      <BitrixScreeningWidgetWorkspace
        dealId={effectiveDealId}
        {...workspaceInput}
        loaderBootstrap={loaderData.prefetchedBootstrap}
        loaderBootstrapInput={loaderData.bootstrapPrefetchInput}
      />
    </main>
  );
}
