/**
 * End-to-end Bitrix REST check matching IC scorer PDF timeline post:
 * 1) disk.storage.getlist (or folder path) → upload PDF
 * 2) crm.timeline.comment.add
 *
 * Env (from apps/frontend/.env when run with cwd apps/frontend):
 *   BITRIX24_WEBHOOK — required
 *   BITRIX_IC_REPORT_FOLDER_ID or BITRIX_IC_REPORT_STORAGE_ID — optional (same as API route)
 *
 * Usage:
 *   bun run --cwd apps/frontend ic-scorer-pdf-test
 *   bun run --cwd apps/frontend ic-scorer-pdf-test -- 25297
 */
import { callBitrix, getBitrixSyncEnv } from "@repo/bitrix-sync";
import {
  formatIcScorerTimelineSummary,
  type IcScorerMemoStructured,
} from "@repo/schemas";
import { buildIcScorerMemoPdfBase64 } from "../lib/server/ic-scorer-pdf";

const LOG = "[ic-scorer-pdf-test]";

type BitrixDiskFile = {
  ID?: number | string;
  DETAIL_URL?: string;
  DOWNLOAD_URL?: string;
};

type BitrixDiskStorage = {
  ID?: number | string;
};

function dummyMemo(dealId: string): IcScorerMemoStructured {
  return {
    scoreHeadline: `Deal ${dealId} — webhook PDF smoke test (${new Date().toISOString()})`,
    investmentThesisMemo:
      "This is a generated test memo to verify disk upload + timeline comment scopes.",
    alignmentMemos: [
      { pillar: "Test", memo: "Automated script; ignore." },
    ],
    strengthBullets: ["Webhook can write to Drive and CRM timeline."],
    riskAndGapsMemo: [
      {
        risk: "None — synthetic test.",
        suggestedAction: "Delete this comment if unwanted.",
      },
    ],
    recommendationMemo: "Confirm PDF link appears below; then remove from timeline if needed.",
  };
}

async function resolveStorageId(webhookBaseUrl: string): Promise<string | null> {
  const configured = process.env.BITRIX_IC_REPORT_STORAGE_ID?.trim();
  if (configured) return configured;
  console.info(`${LOG} step: disk.storage.getlist`);
  const storages = await callBitrix<BitrixDiskStorage[]>(
    "disk.storage.getlist",
    {},
    { webhookBaseUrl },
  );
  const id = storages.find((s) => s.ID != null)?.ID;
  return id == null ? null : String(id);
}

function fileNameFor(dealId: string): string {
  return `ic-webhook-test-deal-${dealId}-${Date.now()}.pdf`;
}

async function main() {
  const dealArg = process.argv.slice(2).find((a) => /^\d+$/.test(a));
  const dealId = dealArg ?? "25297";
  const env = getBitrixSyncEnv();
  if (!env?.webhookBaseUrl) {
    console.error(`${LOG} Set BITRIX24_WEBHOOK in apps/frontend/.env (not BITRIX_WEBHOOK).`);
    process.exit(1);
  }
  const { webhookBaseUrl } = env;
  console.info(`${LOG} webhook host: ${new URL(webhookBaseUrl).host} dealId=${dealId}`);

  const memo = dummyMemo(dealId);
  const pdfName = fileNameFor(dealId);
  const pdfBase64 = buildIcScorerMemoPdfBase64({
    dealId,
    score: null,
    memo,
  });

  let pdfFile: BitrixDiskFile;
  const folderId = process.env.BITRIX_IC_REPORT_FOLDER_ID?.trim();
  try {
    if (folderId) {
      console.info(`${LOG} step: disk.folder.uploadfile (folder id from env)`);
      pdfFile = await callBitrix<BitrixDiskFile>(
        "disk.folder.uploadfile",
        {
          id: folderId,
          data: { NAME: pdfName },
          fileContent: [pdfName, pdfBase64],
          generateUniqueName: true,
        },
        { webhookBaseUrl },
      );
    } else {
      const storageId = await resolveStorageId(webhookBaseUrl);
      if (!storageId) {
        console.error(
          `${LOG} No storage: set BITRIX_IC_REPORT_FOLDER_ID or BITRIX_IC_REPORT_STORAGE_ID`,
        );
        process.exit(1);
      }
      console.info(`${LOG} step: disk.storage.uploadFile storageId=${storageId}`);
      pdfFile = await callBitrix<BitrixDiskFile>(
        "disk.storage.uploadFile",
        {
          id: storageId,
          data: { NAME: pdfName },
          fileContent: [pdfName, pdfBase64],
          generateUniqueName: true,
        },
        { webhookBaseUrl },
      );
    }
    console.info(`${LOG} disk OK fileId=${pdfFile.ID}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${LOG} FAILED at disk upload — ${msg}`);
    process.exit(1);
  }

  const pdfUrl = pdfFile.DETAIL_URL || pdfFile.DOWNLOAD_URL || "";
  const comment = [
    formatIcScorerTimelineSummary(memo),
    "",
    pdfUrl ? `PDF report: ${pdfUrl}` : null,
    pdfFile?.ID ? `Bitrix file ID: ${pdfFile.ID}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    console.info(`${LOG} step: crm.timeline.comment.add`);
    const commentId = await callBitrix<number | string>(
      "crm.timeline.comment.add",
      {
        fields: {
          ENTITY_ID: Number(dealId),
          ENTITY_TYPE: "deal",
          COMMENT: comment,
        },
      },
      { webhookBaseUrl },
    );
    console.info(`${LOG} timeline OK commentId=${commentId}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      `${LOG} FAILED at crm.timeline.comment.add (disk upload already succeeded) — ${msg}`,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(LOG, e);
  process.exit(1);
});
