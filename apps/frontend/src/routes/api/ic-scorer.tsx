import { createFileRoute } from "@tanstack/react-router";
import { revalidateTag } from "@/lib/cache-invalidation";
import { auth } from "@/auth";
import {
  isAiBitrixExtractRequestAllowed,
  isLocalDevWidgetRequest,
} from "@/lib/server/bitrix-ai-widget-gate";
import { getBitrixSyncEnv } from "@repo/bitrix-sync";
import { fetchBitrixWidgetDealSnapshot } from "@/lib/server/bitrix-widget-deal-snapshot";

function parseDealId(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const o = body as Record<string, unknown>;
  if (typeof o.dealId === "string") return o.dealId.trim();
  if (typeof o.id === "string") return o.id.trim();
  return "";
}

export const Route = createFileRoute("/api/ic-scorer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        const signedIn = session?.user != null;
        if (
          !signedIn &&
          !isLocalDevWidgetRequest(request) &&
          !isAiBitrixExtractRequestAllowed(request)
        ) {
          return Response.json(
            {
              error:
                "Forbidden: sign in, or call from this app / Bitrix origin",
            },
            { status: 403 },
          );
        }

        const rawText = await request.text();
        const headers = Object.fromEntries(request.headers.entries());

        console.info(
          "[ic-scorer] request (e.g. Bitrix outbound / deal update)",
          {
            method: request.method,
            url: request.url,
            headers,
            rawBody: rawText,
          },
        );

        let body: unknown;
        try {
          body = rawText ? JSON.parse(rawText) : null;
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        console.info("[ic-scorer] parsed JSON body", body);

        const dealId = parseDealId(body);
        if (!dealId) {
          return Response.json(
            { error: "dealId (or id) is required" },
            { status: 400 },
          );
        }

        try {
          const env = getBitrixSyncEnv();
          const snap = await fetchBitrixWidgetDealSnapshot({
            dealId,
            webhookBaseUrl: env?.webhookBaseUrl,
          });
          revalidateTag("deals", "max");
          return Response.json({
            dealId,
            ok: true,
            webhookConfigured: Boolean(env?.webhookBaseUrl),
            hasDealSnapshot: snap != null,
            fieldCatalogSize: snap?.fieldRows.length ?? 0,
            dealKeys:
              snap?.rawDeal && typeof snap.rawDeal === "object"
                ? Object.keys(snap.rawDeal).length
                : 0,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[ic-scorer] failed", msg);
          const status =
            msg.includes("BITRIX24_WEBHOOK") || msg.includes("not configured")
              ? 503
              : 500;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
