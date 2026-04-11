/**
 * Bitrix deal user-field codes used when syncing opportunities.
 *
 * Defaults match the DAC portal snapshot in `data/bitrix-deal-fields.json`.
 * Override any key with env `BITRIX_UF_<KEY>` (see `getBitrixOpportunitySyncUfCodes`).
 *
 * Broker UFs default to empty: import fills broker name/email/phone from the deal's
 * linked CRM contact (`CONTACT_ID` / `CONTACT_IDS`) when UFs are unset. To map
 * explicit broker UFs, set `BITRIX_UF_BROKER_*` to real `UF_CRM_*` from
 * `bun run fetch-deal-fields`.
 */
export const BITRIX_UF_DEFAULTS = {
  revenue: "UF_CRM_1715146259470",
  sourceWebsite: "UF_CRM_1715146404315",
  companyLocation: "UF_CRM_1711453168658",
  brokerFirstName: "",
  brokerLastName: "",
  brokerEmail: "",
  brokerLinkedIn: "",
  brokerWorkPhone: "",
  askingPrice: "UF_CRM_1727869474151",
  /** EBITDA money UF; also set `BITRIX_DEAL_EBITDA_UF` or refresh `fetch-deal-fields` for auto-detect. */
  ebitda: "",
  /** EBITDA margin % UF (optional). */
  ebitdaMargin: "",
  /** External listing URL (Bitrix “Deal Link”); set `BITRIX_UF_DEAL_LISTING_URL` to your `UF_CRM_*` code. */
  dealListingUrl: "",
} as const;

/** Alias for older imports; same object as {@link BITRIX_UF_DEFAULTS}. */
export const BITRIX_UF = BITRIX_UF_DEFAULTS;

export type BitrixOpportunityUfDefaults = typeof BITRIX_UF_DEFAULTS;

export function getBitrixOpportunitySyncUfCodes(): {
  [K in keyof BitrixOpportunityUfDefaults]: string;
} {
  const e = (envKey: string, fallback: string) =>
    process.env[envKey]?.trim() || fallback;
  return {
    revenue: e("BITRIX_UF_REVENUE", BITRIX_UF_DEFAULTS.revenue),
    sourceWebsite: e(
      "BITRIX_UF_SOURCE_WEBSITE",
      BITRIX_UF_DEFAULTS.sourceWebsite,
    ),
    companyLocation: e(
      "BITRIX_UF_COMPANY_LOCATION",
      BITRIX_UF_DEFAULTS.companyLocation,
    ),
    brokerFirstName: e(
      "BITRIX_UF_BROKER_FIRST_NAME",
      BITRIX_UF_DEFAULTS.brokerFirstName,
    ),
    brokerLastName: e(
      "BITRIX_UF_BROKER_LAST_NAME",
      BITRIX_UF_DEFAULTS.brokerLastName,
    ),
    brokerEmail: e("BITRIX_UF_BROKER_EMAIL", BITRIX_UF_DEFAULTS.brokerEmail),
    brokerLinkedIn: e(
      "BITRIX_UF_BROKER_LINKEDIN",
      BITRIX_UF_DEFAULTS.brokerLinkedIn,
    ),
    brokerWorkPhone: e(
      "BITRIX_UF_BROKER_PHONE",
      BITRIX_UF_DEFAULTS.brokerWorkPhone,
    ),
    askingPrice: e("BITRIX_UF_ASKING_PRICE", BITRIX_UF_DEFAULTS.askingPrice),
    ebitda: e("BITRIX_UF_EBITDA", BITRIX_UF_DEFAULTS.ebitda),
    ebitdaMargin: e(
      "BITRIX_UF_EBITDA_MARGIN",
      BITRIX_UF_DEFAULTS.ebitdaMargin,
    ),
    dealListingUrl: e(
      "BITRIX_UF_DEAL_LISTING_URL",
      BITRIX_UF_DEFAULTS.dealListingUrl,
    ),
  };
}
