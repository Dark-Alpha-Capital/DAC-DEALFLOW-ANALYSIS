/**
 * Fetches CRM deal field metadata and writes `data/bitrix-deal-fields.json`
 * (or use printed JSON as `BITRIX_DEAL_FIELDS_JSON`).
 *
 * Merges:
 * - `crm.deal.fields` — standard + many portals include UF_* in one object
 * - `crm.deal.userfield.list` (paginated) — all custom field definitions; fills gaps on older portals
 *
 * Env: `BITRIX24_WEBHOOK` in `packages/bitrix-sync/.env` (see `load-package-env.ts`).
 *
 * Usage:
 *   cd packages/bitrix-sync && bun run fetch-deal-fields
 *   bun run --cwd packages/bitrix-sync fetch-deal-fields
 */
import "./load-package-env.ts";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { callBitrix, callBitrixListAll } from "../src/client";
import { getBitrixSyncEnv } from "../src/env";
import {
  mergeBitrixDealFieldRows,
  normalizeBitrixDealFieldsResult,
  normalizeBitrixDealUserfieldListItem,
  type BitrixDealFieldRow,
} from "../src/deal-fields-catalog";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "bitrix-deal-fields.json");

async function main() {
  const env = getBitrixSyncEnv();
  if (!env?.webhookBaseUrl) {
    console.error("Set BITRIX24_WEBHOOK");
    process.exit(1);
  }

  const raw = await callBitrix<Record<string, unknown>>(
    "crm.deal.fields",
    {},
    { webhookBaseUrl: env.webhookBaseUrl },
  );

  const fromDealFields = normalizeBitrixDealFieldsResult(raw);

  let fromUserfieldListCount = 0;
  const userfieldRows: BitrixDealFieldRow[] = [];
  try {
    const ufItems = await callBitrixListAll<Record<string, unknown>>(
      "crm.deal.userfield.list",
      { order: { ID: "ASC" } },
      { webhookBaseUrl: env.webhookBaseUrl },
    );
    fromUserfieldListCount = ufItems.length;
    for (const item of ufItems) {
      const row = normalizeBitrixDealUserfieldListItem(item);
      if (row) userfieldRows.push(row);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      `Warning: crm.deal.userfield.list failed — catalog may miss some custom fields.\n  ${msg}`,
    );
  }

  const fields = mergeBitrixDealFieldRows(fromDealFields, userfieldRows);
  const payload = {
    fetchedAt: new Date().toISOString(),
    source: "crm.deal.fields + crm.deal.userfield.list",
    fields,
  };

  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.error(
    `Wrote ${fields.length} unique fields to ${OUT} (crm.deal.fields: ${fromDealFields.length}; userfield.list rows: ${fromUserfieldListCount})`,
  );
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("METHOD_NOT_FOUND") || msg.includes("not found")) {
    console.error(`
Bitrix returned an error for crm.deal.fields.

  ${msg}

Some portals require a newer webhook scope or use a different REST surface.
Try widening CRM permissions on the inbound webhook, or paste JSON from
Bitrix Developer resources → Request builder into data/bitrix-deal-fields.json
using the shape: { "fetchedAt": "...", "source": "crm.deal.fields", "fields": [...] }.
`);
    process.exit(1);
  }
  if (msg.includes("insufficient_scope")) {
    console.error(`
Bitrix returned insufficient_scope for this webhook.

  ${msg}

Enable CRM (and field read) permissions on the inbound webhook, then retry.
`);
    process.exit(1);
  }
  console.error(msg);
  process.exit(1);
});
