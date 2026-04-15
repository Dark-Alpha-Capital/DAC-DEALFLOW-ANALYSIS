/**
 * Fetches one deal via `crm.deal.get`, prints a readable snapshot, and resolves
 * CRM file attachment URLs to absolute links (portal base from `BITRIX24_PORTAL_BASE`
 * or inferred from `BITRIX24_WEBHOOK`).
 *
 * Env: `BITRIX24_WEBHOOK` in `packages/bitrix-sync/.env` (see `load-package-env.ts`).
 * Optional: `BITRIX24_PORTAL_BASE=https://yourportal.bitrix24.com`
 *
 * Usage:
 *   bun run --cwd packages/bitrix-sync log-deal 24995
 *   bun run --cwd packages/bitrix-sync log-deal --deal=24995
 *   bun run --cwd packages/bitrix-sync log-deal 24995 --json
 *   bun run --cwd packages/bitrix-sync log-deal 24995 --verbose
 */
import "./load-package-env.ts";
import { callBitrix } from "../src/client";
import {
  buildBitrixDealDetailUrl,
  getBitrixSyncEnv,
  inferPortalBaseFromWebhook,
  resolveBitrixPortalUrl,
} from "../src/env";
import { normalizeBitrixDealFieldsResult } from "../src/deal-fields-catalog";

function parseArgs(): { dealId: string; jsonOnly: boolean; verbose: boolean } {
  const argv = process.argv.slice(2);
  let dealId = "";
  let jsonOnly = false;
  let verbose = false;
  for (const a of argv) {
    if (a === "--json") {
      jsonOnly = true;
      continue;
    }
    if (a === "--verbose" || a === "-v") {
      verbose = true;
      continue;
    }
    if (a.startsWith("--deal=")) {
      dealId = a.slice("--deal=".length).trim();
      continue;
    }
    if (!a.startsWith("-") && !dealId) {
      dealId = a.trim();
    }
  }
  return { dealId, jsonOnly, verbose };
}

/** Bitrix sometimes returns titles with embedded newlines — one line for headers. */
function singleLineTitle(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function fieldTypeLooksLikeFile(type: string | undefined): boolean {
  const t = (type ?? "").toLowerCase();
  return t.includes("file") || t.includes("disk");
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}… (${str.length} chars)`;
}

/** Pretty lines for CRM `file` UF values (object, array, or primitive id). */
function formatFileFieldLines(
  value: unknown,
  portalBase: string,
): string[] {
  const out: string[] = [];

  if (value == null || value === "") {
    out.push("  (empty)");
    return out;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push("  (no files attached)");
      return out;
    }
    for (let i = 0; i < value.length; i++) {
      out.push(`  ── File ${i + 1} ──`);
      out.push(...formatFileFieldLines(value[i], portalBase).map((l) => (l.startsWith("  ") ? l : `  ${l}`)));
    }
    return out;
  }

  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const idRaw = o.id ?? o.ID ?? o.FILE_ID ?? o.fileId;
    const showRaw =
      o.showUrl ?? o.SHOW_URL ?? o.show_url ?? o.url ?? o.URL;
    const dlRaw =
      o.downloadUrl ?? o.DOWNLOAD_URL ?? o.download_url ?? o.DOWNLOAD;

    if (idRaw != null && String(idRaw).trim()) {
      out.push(`  CRM / attachment id : ${String(idRaw).trim()}`);
      out.push(
        "  Note: app sync calls disk.file.get (Drive id). CRM `id` here may differ from Drive file id.",
      );
    }

    if (typeof showRaw === "string" && showRaw.trim()) {
      const abs = resolveBitrixPortalUrl(portalBase, showRaw);
      out.push(`  View in Bitrix       : ${abs}`);
    }
    if (typeof dlRaw === "string" && dlRaw.trim()) {
      const abs = resolveBitrixPortalUrl(portalBase, dlRaw);
      out.push(`  Download (CRM link)  : ${abs}`);
    }

    if (out.length === 0) {
      out.push(`  ${truncate(JSON.stringify(value), 400)}`);
    }
    return out;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const id = String(value).trim();
    out.push(`  Raw value (often file id): ${id}`);
    return out;
  }

  out.push(`  ${truncate(String(value), 400)}`);
  return out;
}

function formatScalarOneLine(value: unknown, maxLen: number): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    const collapsed = value.replace(/\s+/g, " ").trim();
    return truncate(collapsed, maxLen);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") return "{…}";
  return truncate(String(value), maxLen);
}

async function main() {
  const { dealId, jsonOnly, verbose } = parseArgs();
  if (!dealId) {
    console.error(
      "Usage: bun run log-deal <dealId>   or   bun run log-deal --deal=<dealId> [--json] [--verbose]",
    );
    process.exit(1);
  }

  const env = getBitrixSyncEnv();
  if (!env?.webhookBaseUrl) {
    console.error("Set BITRIX24_WEBHOOK in packages/bitrix-sync/.env");
    process.exit(1);
  }

  const opts = { webhookBaseUrl: env.webhookBaseUrl };

  const deal = await callBitrix<Record<string, unknown>>(
    "crm.deal.get",
    { id: dealId },
    opts,
  );

  if (jsonOnly) {
    console.log(JSON.stringify(deal, null, 2));
    return;
  }

  const portalBase =
    env.portalBaseUrl?.trim() || inferPortalBaseFromWebhook(env.webhookBaseUrl);
  const dealDetailUrl = buildBitrixDealDetailUrl(portalBase, String(dealId));

  let metaByKey = new Map<string, { type: string; title: string }>();
  try {
    const fieldsRaw = await callBitrix<Record<string, unknown>>(
      "crm.deal.fields",
      {},
      opts,
    );
    const rows = normalizeBitrixDealFieldsResult(fieldsRaw);
    metaByKey = new Map(
      rows.map((r) => [r.fieldId, { type: r.type, title: r.title }]),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`Warning: crm.deal.fields failed (types will be unknown):\n  ${msg}\n`);
  }

  const id = deal.ID ?? deal.id ?? dealId;
  const title = singleLineTitle(deal.TITLE ?? deal.title ?? "");

  const line = "=".repeat(76);
  console.log(`\n${line}`);
  console.log("BITRIX DEAL SNAPSHOT");
  console.log(line);
  console.log(`Deal ID       : ${String(id)}`);
  console.log(`Title         : ${title || "—"}`);
  console.log(`Portal base   : ${portalBase || "(set BITRIX24_PORTAL_BASE if wrong)"}`);
  if (dealDetailUrl) {
    console.log(`Open in CRM   : ${dealDetailUrl}`);
  }
  console.log(line);

  const keys = Object.keys(deal).filter((k) => k !== "undefined");
  keys.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const fileKeys = keys.filter((k) =>
    fieldTypeLooksLikeFile(metaByKey.get(k)?.type),
  );

  console.log("\n▸ FILE FIELDS (attachments)\n");
  if (fileKeys.length === 0) {
    console.log("  No fields typed as file/disk in crm.deal.fields metadata.\n");
  } else {
    for (const key of fileKeys) {
      const meta = metaByKey.get(key);
      const label = meta?.title?.trim() && meta.title !== key ? meta.title : key;
      console.log(`  ${key}`);
      console.log(`  Label : ${label}  [${meta?.type ?? "?"}]`);
      for (const line of formatFileFieldLines(deal[key], portalBase)) {
        console.log(line);
      }
      console.log("");
    }
  }

  const maxVal = verbose ? 20_000 : 120;
  console.log(`${line}`);
  console.log(verbose ? "▸ ALL FIELDS (full values)\n" : "▸ ALL FIELDS (compact — use --verbose for long text)\n");

  const rows: { field: string; type: string; value: string }[] = [];
  for (const key of keys) {
    if (fileKeys.includes(key) && !verbose) {
      const v = deal[key];
      const summary =
        Array.isArray(v) && v.length === 0
          ? "(empty)"
          : typeof v === "object" && v !== null && !Array.isArray(v)
            ? "{ attachment metadata — see FILE FIELDS above }"
            : formatScalarOneLine(v, maxVal);
      rows.push({
        field: key,
        type: metaByKey.get(key)?.type ?? "?",
        value: summary,
      });
      continue;
    }
    const raw = deal[key];
    let valueStr: string;
    if (verbose) {
      if (
        typeof raw === "object" &&
        raw !== null &&
        !Array.isArray(raw) &&
        fieldTypeLooksLikeFile(metaByKey.get(key)?.type)
      ) {
        valueStr = formatFileFieldLines(raw, portalBase).join("\n");
      } else if (typeof raw === "object") {
        try {
          valueStr = JSON.stringify(raw, null, 2);
        } catch {
          valueStr = String(raw);
        }
      } else {
        valueStr = formatScalarOneLine(raw, maxVal);
      }
    } else {
      valueStr = formatScalarOneLine(raw, maxVal);
    }
    rows.push({
      field: key,
      type: metaByKey.get(key)?.type ?? "?",
      value: valueStr,
    });
  }

  for (const r of rows) {
    console.log(`${r.field}`);
    console.log(`  type  : ${r.type}`);
    const indented = r.value.split("\n").join("\n  | ");
    console.log(`  value : ${indented}`);
    console.log("");
  }

  console.log(line);
  console.log("Tip: --json  raw crm.deal.get   |   --verbose  full/long fields\n");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
