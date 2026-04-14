import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BitrixScreeningWidgetWorkspace } from "@/components/deal-opportunities/bitrix-screening-widget-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const searchSchema = z.object({
  dealId: z.string().min(1).optional(),
  memberId: z.string().optional(),
  expiresAt: z.coerce.number().int().positive().optional(),
  authSig: z.string().optional(),
  authId: z.string().optional(),
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
  const href = typeof window !== "undefined" ? window.location.href : "";
  const rawParams =
    typeof window !== "undefined"
      ? Object.fromEntries(new URLSearchParams(window.location.search).entries())
      : {};
  const hasSignedAuth = Boolean(
    search.memberId && search.expiresAt && search.authSig,
  );
  const hasBitrixAuth = Boolean(search.authId && search.domain);
  const missingCore = search.dealId ? [] : ["dealId"];
  const authHint = hasSignedAuth
    ? "signed-auth"
    : hasBitrixAuth
      ? "bitrix-auth"
      : "missing-auth";

  const debugPayload = {
    href,
    rawQueryParams: rawParams,
    normalizedParams: search,
    authMode: authHint,
    missingCore,
    checks: {
      hasDealId: Boolean(search.dealId),
      hasSignedAuth,
      hasBitrixAuth,
    },
  };

  if (!search.dealId) {
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
        dealId={search.dealId}
        memberId={search.memberId}
        expiresAt={search.expiresAt}
        authSig={search.authSig}
        authId={search.authId}
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
