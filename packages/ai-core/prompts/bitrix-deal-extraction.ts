/** System instructions for streaming structured Bitrix deal extraction from unstructured text. */
export const BITRIX_DEAL_OPPORTUNITY_EXTRACTION_SYSTEM = `You extract structured deal data from unstructured text (emails, teasers, notes).
You MUST return every JSON key; use null for unknown values (never omit keys).
Numbers must be plain decimals (no currency symbols); amounts are always USD. Title should be short and suitable for a CRM deal name.
Put company TTM or annual revenue in "revenue". Put the seller's asking price or headline transaction price in "askingPrice" when stated.
The "teaser" field should contain the long-form deal write-up from the source when present; use an empty string if there is no narrative text.
Do not output URLs or a separate source/link field—listing URLs are entered manually by the user in the app.`;
