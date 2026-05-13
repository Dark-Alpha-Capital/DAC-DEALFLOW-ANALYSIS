import { createFileRoute } from "@tanstack/react-router";
import { callBitrix, getBitrixSyncEnv } from "@repo/bitrix-sync";
import {
  formatIcScorerTimelineSummary,
  type IcScorerMemoStructured,
} from "@repo/schemas";
import { auth } from "@/auth";
import {
  isAiBitrixExtractRequestAllowed,
  isLocalDevWidgetRequest,
} from "@/lib/server/bitrix-ai-widget-gate";
import { buildIcScorerMemoPdfBase64 } from "@/lib/server/ic-scorer-pdf";

/** Bitrix silently accepts very large COMMENT bodies but UI truncates oddly — cap to keep memos readable. */
const MAX_COMMENT_CHARS = 32_000;

type PostTimelineBody = {
  dealId?: unknown;
  id?: unknown;
  /** Plain text (preferred). */
  comment?: unknown;
  /** @deprecated Legacy HTML/plain body; use `comment`. */
  memoHtml?: unknown;
  /** Structured memo used to render the PDF attachment. */
  memo?: unknown;
  /** When true, upload a formatted PDF and include its link in the timeline comment. */
  postPdf?: unknown;
  fileName?: unknown;
  score?: unknown;
};

function parseStructuredMemo(raw: unknown): IcScorerMemoStructured | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<IcScorerMemoStructured>;
  if (
    typeof value.scoreHeadline !== "string" ||
    typeof value.investmentThesisMemo !== "string" ||
    typeof value.recommendationMemo !== "string" ||
    !Array.isArray(value.alignmentMemos) ||
    !Array.isArray(value.strengthBullets) ||
    !Array.isArray(value.riskAndGapsMemo)
  ) {
    return null;
  }
  const alignmentMemos = value.alignmentMemos.filter(
    (row): row is { pillar: string; memo: string } =>
      row != null &&
      typeof row === "object" &&
      typeof (row as { pillar?: unknown }).pillar === "string" &&
      typeof (row as { memo?: unknown }).memo === "string",
  );
  const riskAndGapsMemo = value.riskAndGapsMemo.filter(
    (row): row is { risk: string; suggestedAction: string } =>
      row != null &&
      typeof row === "object" &&
      typeof (row as { risk?: unknown }).risk === "string" &&
      typeof (row as { suggestedAction?: unknown }).suggestedAction ===
        "string",
  );
  return {
    scoreHeadline: value.scoreHeadline,
    investmentThesisMemo: value.investmentThesisMemo,
    alignmentMemos,
    strengthBullets: value.strengthBullets.filter(
      (s): s is string => typeof s === "string",
    ),
    riskAndGapsMemo,
    recommendationMemo: value.recommendationMemo,
  };
}

function parseBody(raw: unknown): {
  dealId: string;
  comment: string;
  memo: IcScorerMemoStructured | null;
  postPdf: boolean;
  fileName: string | null;
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
  const memo = parseStructuredMemo(b.memo);
  const fileName =
    typeof b.fileName === "string" && b.fileName.trim()
      ? b.fileName.trim()
      : null;
  if (!dealId || !comment) return null;
  return {
    dealId,
    comment,
    memo,
    postPdf: b.postPdf === true,
    fileName,
    score: scoreNum,
  };
}

type BitrixDiskFile = {
  ID?: number | string;
  DETAIL_URL?: string;
  DOWNLOAD_URL?: string;
  NAME?: string;
};

type BitrixDiskStorage = {
  ID?: number | string;
  NAME?: string;
};

function safePdfFileName(value: string | null, dealId: string): string {
  const base =
    value?.trim() ||
    `ic-readiness-report-deal-${dealId}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const normalized = base.replace(/[^\w.\- ]+/g, "-").trim();
  return normalized.toLowerCase().endsWith(".pdf")
    ? normalized
    : `${normalized}.pdf`;
}

async function resolveBitrixReportStorageId(webhookBaseUrl: string) {
  const configured = process.env.BITRIX_IC_REPORT_STORAGE_ID?.trim();
  if (configured) return configured;
  const storages = await callBitrix<BitrixDiskStorage[]>(
    "disk.storage.getlist",
    {},
    { webhookBaseUrl },
  );
  const firstStorageId = storages.find((s) => s.ID != null)?.ID;
  return firstStorageId == null ? null : String(firstStorageId);
}

async function uploadIcReportPdf(input: {
  dealId: string;
  score: number | null;
  memo: IcScorerMemoStructured;
  fileName: string;
  webhookBaseUrl: string;
}): Promise<BitrixDiskFile> {
  const pdfBase64 = buildIcScorerMemoPdfBase64({
    dealId: input.dealId,
    score: input.score,
    memo: input.memo,
  });
  const folderId = process.env.BITRIX_IC_REPORT_FOLDER_ID?.trim();
  if (folderId) {
    return callBitrix<BitrixDiskFile>(
      "disk.folder.uploadfile",
      {
        id: folderId,
        data: { NAME: input.fileName },
        fileContent: [input.fileName, pdfBase64],
        generateUniqueName: true,
      },
      { webhookBaseUrl: input.webhookBaseUrl },
    );
  }

  const storageId = await resolveBitrixReportStorageId(input.webhookBaseUrl);
  if (!storageId) {
    throw new Error(
      "No Bitrix Disk storage found. Set BITRIX_IC_REPORT_FOLDER_ID or BITRIX_IC_REPORT_STORAGE_ID.",
    );
  }
  return callBitrix<BitrixDiskFile>(
    "disk.storage.uploadFile",
    {
      id: storageId,
      data: { NAME: input.fileName },
      fileContent: [input.fileName, pdfBase64],
      generateUniqueName: true,
    },
    { webhookBaseUrl: input.webhookBaseUrl },
  );
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

        try {
          let pdfFile: BitrixDiskFile | null = null;
          if (parsed.postPdf) {
            if (!parsed.memo) {
              return Response.json(
                { error: "Structured memo is required to post a PDF" },
                { status: 400 },
              );
            }
            pdfFile = await uploadIcReportPdf({
              dealId: parsed.dealId,
              score: parsed.score,
              memo: parsed.memo,
              fileName: safePdfFileName(parsed.fileName, parsed.dealId),
              webhookBaseUrl: env.webhookBaseUrl,
            });
          }

          const pdfUrl = pdfFile?.DETAIL_URL || pdfFile?.DOWNLOAD_URL || "";
          const commentBody =
            parsed.postPdf && parsed.memo
              ? [
                  formatIcScorerTimelineSummary(parsed.memo),
                  "",
                  pdfUrl ? `PDF report: ${pdfUrl}` : null,
                  pdfFile?.ID ? `Bitrix file ID: ${pdfFile.ID}` : null,
                ]
                  .filter(Boolean)
                  .join("\n")
              : parsed.comment;
          const trimmed =
            commentBody.length > MAX_COMMENT_CHARS
              ? commentBody.slice(0, MAX_COMMENT_CHARS)
              : commentBody;
          const truncated = trimmed.length < commentBody.length;

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
            pdfFileId: pdfFile?.ID,
          });
          return Response.json({
            ok: true,
            commentId,
            truncated,
            pdfFileId: pdfFile?.ID ?? null,
            pdfUrl: pdfUrl || null,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[ic-scorer/post-timeline] failed", msg);
          return Response.json({ error: msg }, { status: 502 });
        }
      },
    },
  },
});
