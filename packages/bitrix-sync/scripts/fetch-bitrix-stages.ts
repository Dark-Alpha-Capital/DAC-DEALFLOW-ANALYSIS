/**
 * Prints Kanban stages for ONE Bitrix **deal pipeline** (funnel / category) as JSON
 * for `data/bitrix-deal-stages.json` or `BITRIX_DEAL_STAGES_JSON`.
 *
 * ## What is the pipeline id?
 * Bitrix does **not** expose a single global list of “all deal stages”. Each **deal
 * pipeline** (Sales funnel / direction) has its own Kanban columns. The REST method
 * `crm.dealcategory.stage.list` takes **`id`** = that pipeline’s numeric id.
 * - **`id: 0`** (or omit in some setups) → **default** deal pipeline.
 * - **`id: 1`, `2`, …** → other funnels; discover them with `--list-pipelines`.
 *
 * This matches `BITRIX_DEAL_PIPELINE_ID` in the app (`packages/bitrix-sync/src/env.ts`).
 *
 * Env: put `BITRIX24_WEBHOOK` in `packages/bitrix-sync/.env`. Override pipeline with `--pipeline <id>`.
 * The script loads that file automatically (see `load-package-env.ts`).
 *
 * If you see `insufficient_scope` / HTTP 401: the inbound webhook’s permissions are too narrow.
 * In Bitrix24 → Applications → Developer resources → open your webhook → enable **CRM** (and any
 * scope needed for deal funnels / settings), or create a new inbound webhook with broader CRM access.
 *
 * Usage:
 *   cd packages/bitrix-sync && bun run fetch-stages --list-pipelines
 *   cd packages/bitrix-sync && bun run fetch-stages
 *   # or from repo root:
 *   bun run --cwd packages/bitrix-sync fetch-stages
 */
import "./load-package-env.ts";
import { callBitrix } from "../src/client";
import { BITRIX_DEAL_PIPELINE_ID, getBitrixSyncEnv } from "../src/env";

type StageRow = {
  NAME: string;
  STATUS_ID: string;
};

type DealCategoryRow = {
  ID: string | number;
  NAME: string;
  SORT?: string | number;
};

const listPipelines = process.argv.includes("--list-pipelines");

async function main() {
  const env = getBitrixSyncEnv();
  if (!env?.webhookBaseUrl) {
    console.error("Set BITRIX24_WEBHOOK");
    process.exit(1);
  }
  const opts = { webhookBaseUrl: env.webhookBaseUrl };

  if (listPipelines) {
    const rows = await callBitrix<DealCategoryRow[]>("crm.dealcategory.list", {
      order: { SORT: "ASC" },
      filter: { IS_LOCKED: "N" },
      select: ["ID", "NAME", "SORT"],
    });
    const list = Array.isArray(rows) ? rows : [];
    const out = list.map((r) => ({
      id: String(r.ID),
      name: r.NAME,
      sort: r.SORT,
    }));
    console.log(JSON.stringify(out, null, 2));
    console.error(
      "\nUse the `id` of the pipeline you use for PE deals (or set `BITRIX_DEAL_PIPELINE_ID` in code), then run fetch-stages without --list-pipelines.",
    );
    return;
  }

  const argPipeline = process.argv.findIndex((a) => a === "--pipeline");
  const fromArg =
    argPipeline >= 0 ? process.argv[argPipeline + 1]?.trim() : "";
  const dealPipelineId = fromArg || BITRIX_DEAL_PIPELINE_ID;
  if (!dealPipelineId) {
    console.error(
      "Missing pipeline id. Pass --pipeline <id> (try 0 for default), or run with --list-pipelines.",
    );
    process.exit(1);
  }

  /** Official parameter name is `id` (pipeline / direction id), not filter ENTITY_ID. */
  const rows = await callBitrix<StageRow[]>(
    "crm.dealcategory.stage.list",
    { id: dealPipelineId },
    opts,
  );

  const out = (Array.isArray(rows) ? rows : [])
    .map((r) => ({
      statusId: r.STATUS_ID,
      name: r.NAME,
    }))
    .filter((r) => r.statusId);

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("insufficient_scope")) {
    console.error(`
Bitrix returned insufficient_scope for this webhook.

  ${msg}

Your inbound webhook can call some methods (e.g. crm.deal.add) but not
crm.dealcategory.list / crm.dealcategory.stage.list until you widen permissions.

Fix: Bitrix24 → Applications → Developer resources → open this webhook →
assign CRM permissions that include reading deal funnels / categories (often
"CRM" at full scope for that user). Save; update BITRIX24_WEBHOOK if Bitrix
issues a new URL.

Workaround: use Request Builder in Developer resources to run those methods
manually and paste the JSON into packages/bitrix-sync/data/bitrix-deal-stages.json
`);
    process.exit(1);
  }
  console.error(msg);
  process.exit(1);
});
