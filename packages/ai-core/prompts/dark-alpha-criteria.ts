/**
 * Dark Alpha Capital investment criteria + sector focus + PE Toolkit frameworks
 * used by the IC Readiness Scorer system prompt.
 *
 * TODO(criteria): Replace placeholder sections with the firm's real criteria text.
 * Keep this file as plain markdown inside a template literal so bundlers are happy
 * and editors render it via markdown preview on save.
 */
export const DARK_ALPHA_CRITERIA = `# Dark Alpha Capital — Investment Criteria

## Target company profile
<!-- TODO(criteria): paste the firm's hard/soft criteria: size, geography, ownership, etc. -->
- Geography: US / North America.
- EBITDA range: $1M – $10M (lower-middle-market).
- Ownership: founder / family-owned, management willing to stay or transition.
- Stable, recurring-revenue preferred; customer concentration under 25% ideal.

## Sector focus
<!-- TODO(criteria): finalize sector list and any anti-sectors. -->
- Manufacturing
- Business Services
- Healthcare Services
- Aerospace & Defense
- Industrial Services
- Technology-enabled services with automation / AI upside

## Negative screens (automatic decline / heavy scrutiny)
<!-- TODO(criteria): paste firm's real exclusions. -->
- Pure cyclical commodity exposure, asset-heavy project businesses without recurring revenue.
- Regulatory-binary businesses (single license risk).
- Highly concentrated customer (>40% single customer) without contractual lock-in.

## Positive screens (what earns points)
- Stable / growing EBITDA for 3+ years.
- Recurring or subscription revenue (>30% of total).
- Pricing power (inflation pass-through, evidence of price increases without churn).
- Fragmented industry (roll-up / synergy opportunity).
- Operating-partner / management team strength.
- Tech-enabled upside: RPA, AI, ERP consolidation, partnerships.
- Synergies with existing portfolio companies.

## PE Toolkit — frameworks to apply (Tamara Sakovska)
- **Deal selection (Ch. 4–5):** negative screen first (exclusions), then positive screen (fit-for-thesis).
- **Management assessment (Ch. 6):** CEO track record, bench strength, willingness to be coached, alignment.
- **Business plan (Ch. 7):** identify value-creation levers — pricing, commercial excellence, operational efficiency, bolt-ons, digital/AI.
- **Valuation (Ch. 8):** sanity-check entry multiple vs. LTM EBITDA, growth rate, cash-flow stability. Flag if entry multiple looks rich for the growth/quality profile.

## Scoring rubric (IC readiness, 0–100)

| Pillar                              | Weight | Signal of a good score                                                   |
| ----------------------------------- | ------ | ------------------------------------------------------------------------ |
| Financial quality & completeness    | 25     | LTM EBITDA, 3yr history, margin stability, revenue growth — all present. |
| Industry / sector fit               | 15     | In focus sector; fragmentation, secular tailwinds present.               |
| Business quality (moat, recurring)  | 20     | Recurring rev %, low concentration, pricing power evidence.              |
| Management / OP input               | 10     | CEO assessed by OP; succession plan; bench.                              |
| Value-creation plan                 | 15     | At least 2 concrete levers (RPA/AI/ERP/bolt-on/pricing).                 |
| Deal context (CIM, financials, fit) | 10     | CIM received, financials received, prelim valuation, thesis articulated. |
| Data completeness                   | 5      | Few missing fields; gaps have owners / actions.                          |

## Color bands
- **Green (80–100)** – Ready for IC; minor follow-ups at most.
- **Yellow (60–79)** – Not IC-ready yet; fix specific gaps first.
- **Red (<60)** – Do not present; rework the thesis or walk away.
`;
