import { createFileRoute } from "@tanstack/react-router";
import { callBitrix, getBitrixSyncEnv } from "@repo/bitrix-sync";
import { auth } from "@/auth";
import {
  isAiBitrixExtractRequestAllowed,
  isLocalDevWidgetRequest,
} from "@/lib/server/bitrix-ai-widget-gate";

/** Bitrix silently accepts very large COMMENT bodies but UI truncates oddly — cap to keep memos readable. */
const MAX_COMMENT_CHARS = 32_000;

type PostTimelineBody = {
  dealId?: unknown;
  id?: unknown;
  /** Plain text (preferred). */
  comment?: unknown;
  /** @deprecated Legacy HTML/plain body; use `comment`. */
  memoHtml?: unknown;
  score?: unknown;
};

function parseBody(raw: unknown): {
  dealId: string;
  comment: string;
  score: number | null;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as PostTimelineBody;
  const dealRaw =
    typeof b.dealId === "string"
      ? b.dealId
      : typeof b.id === "string"
        ? b.id
        : "";
  const dealId = dealRaw.trim();
  const textRaw =
    typeof b.comment === "string"
      ? b.comment
      : typeof b.memoHtml === "string"
        ? b.memoHtml
        : "";
  const comment = textRaw.trim();
  const scoreNum =
    typeof b.score === "number" && Number.isFinite(b.score) ? b.score : null;
  if (!dealId || !comment) return null;
  return { dealId, comment, score: scoreNum };
}

export const Route = createFileRoute("/api/ic-scorer/post-timeline")({
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

        const env = getBitrixSyncEnv();
        if (!env?.webhookBaseUrl) {
          return Response.json(
            { error: "BITRIX24_WEBHOOK is not configured" },
            { status: 503 },
          );
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = parseBody(json);
        if (!parsed) {
          return Response.json(
            { error: "dealId and non-empty comment (or memoHtml) are required" },
            { status: 400 },
          );
        }
        if (!Number.isFinite(Number(parsed.dealId))) {
          return Response.json(
            { error: "dealId must be numeric" },
            { status: 400 },
          );
        }

        const trimmed =
          parsed.comment.length > MAX_COMMENT_CHARS
            ? parsed.comment.slice(0, MAX_COMMENT_CHARS)
            : parsed.comment;
        const truncated = trimmed.length < parsed.comment.length;

        try {
          const commentId = await callBitrix<number | string>(
            "crm.timeline.comment.add",
            {
              fields: {
                ENTITY_ID: Number(parsed.dealId),
                ENTITY_TYPE: "deal",
                COMMENT: trimmed,
              },
            },
            { webhookBaseUrl: env.webhookBaseUrl },
          );
          console.info("[ic-scorer/post-timeline] posted", {
            dealId: parsed.dealId,
            commentId,
            chars: trimmed.length,
            truncated,
            score: parsed.score,
          });
          return Response.json({ ok: true, commentId, truncated });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[ic-scorer/post-timeline] failed", msg);
          return Response.json({ error: msg }, { status: 502 });
        }
      },
    },
  },
});
