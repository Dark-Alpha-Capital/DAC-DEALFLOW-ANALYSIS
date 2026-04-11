/**
 * Lists all Bitrix deal custom fields (`crm.deal.userfield.list`) and highlights
 * any whose labels look like EBITDA / margin (they are UFs, not core REST fields).
 *
 * Env: `BITRIX24_WEBHOOK` in `packages/bitrix-sync/.env` (see `load-package-env.ts`).
 *
 * Usage:
 *   bun run --cwd packages/bitrix-sync list-deal-userfields-ebitda
 */
import "./load-package-env.ts";
import { callBitrixListAll } from "../src/client";
import { getBitrixSyncEnv } from "../src/env";

type UserfieldRow = Record<string, unknown>;

function pickLabel(row: UserfieldRow): string {
  const candidates = [
    row.EDIT_FORM_LABEL,
    row.LIST_COLUMN_LABEL,
    row.LIST_FILTER_LABEL,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

function isEbitdaRelated(label: string): boolean {
  return /\bebitda\b/i.test(label);
}

async function main() {
  const env = getBitrixSyncEnv();
  if (!env?.webhookBaseUrl) {
    console.error("Set BITRIX24_WEBHOOK in packages/bitrix-sync/.env");
    process.exit(1);
  }

  /** Prefer English labels when the portal supports `filter.LANG` (see Bitrix REST docs). */
  let rows: UserfieldRow[];
  try {
    rows = await callBitrixListAll<UserfieldRow>(
      "crm.deal.userfield.list",
      {
        filter: { LANG: "en" },
        order: { SORT: "ASC", ID: "ASC" },
      },
      { webhookBaseUrl: env.webhookBaseUrl },
    );
  } catch {
    rows = await callBitrixListAll<UserfieldRow>(
      "crm.deal.userfield.list",
      { order: { SORT: "ASC", ID: "ASC" } },
      { webhookBaseUrl: env.webhookBaseUrl },
    );
  }

  const summary = rows.map((row) => {
    const fieldName =
      typeof row.FIELD_NAME === "string" ? row.FIELD_NAME.trim() : "";
    const type =
      typeof row.USER_TYPE_ID === "string"
        ? row.USER_TYPE_ID.trim()
        : "unknown";
    const label = pickLabel(row);
    return {
      FIELD_NAME: fieldName || "(missing)",
      USER_TYPE_ID: type,
      LABEL: label || fieldName,
      ebitdaRelated: isEbitdaRelated(label) || isEbitdaRelated(fieldName),
    };
  });

  const ebitdaHits = summary.filter((r) => r.ebitdaRelated);

  console.log(`Total deal user fields: ${summary.length}\n`);

  console.log("— Fields whose label/code suggests EBITDA / margin —\n");
  if (ebitdaHits.length === 0) {
    console.log(
      "None matched /\\bebitda\\b/i in EDIT_FORM_LABEL / LIST_* labels.\n" +
        "Scroll the full table below or set BITRIX_DEAL_EBITDA_UF manually in CRM → Deal fields.\n",
    );
  } else {
    console.table(
      ebitdaHits.map(({ FIELD_NAME, USER_TYPE_ID, LABEL }) => ({
        FIELD_NAME,
        USER_TYPE_ID,
        LABEL,
      })),
    );
    console.log(
      "\nSuggested env for import:\n" +
        `  BITRIX_DEAL_EBITDA_UF=${ebitdaHits.find((h) => !/\bmargin\b/i.test(h.LABEL))?.FIELD_NAME ?? ebitdaHits[0]!.FIELD_NAME}\n` +
        (ebitdaHits.some((h) => /\bmargin\b/i.test(h.LABEL))
          ? `  BITRIX_DEAL_EBITDA_MARGIN_UF=${ebitdaHits.find((h) => /\bmargin\b/i.test(h.LABEL))?.FIELD_NAME ?? ""}\n`
          : ""),
    );
  }

  const numericFinancialTypes = new Set(["money", "double", "integer"]);
  const numericCandidates = summary.filter((r) =>
    numericFinancialTypes.has(r.USER_TYPE_ID),
  );
  console.log(
    "— Numeric / money user fields (common place for Revenue, EBITDA, etc.) —\n",
  );
  console.table(
    numericCandidates.map(({ FIELD_NAME, USER_TYPE_ID, LABEL }) => ({
      FIELD_NAME,
      USER_TYPE_ID,
      LABEL,
    })),
  );

  console.log("— All deal user fields (FIELD_NAME, type, label) —\n");
  console.table(
    summary.map(({ FIELD_NAME, USER_TYPE_ID, LABEL }) => ({
      FIELD_NAME,
      USER_TYPE_ID,
      LABEL,
    })),
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
