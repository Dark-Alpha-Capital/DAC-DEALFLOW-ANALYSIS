# Bitrix Monorepo

## API Documentation

### GTM Leads Ingest API

Internal endpoint for GTM engineers to submit deal leads from data scraping and deal sourcing.

**Endpoint:** `POST /api/leads/ingest` (full URL: `{NEXT_PUBLIC_APP_URL}/api/leads/ingest`)

**Authentication:** Provide the shared API key via one of:

- Header: `X-GTM-API-Key: <your-key>`
- Header: `Authorization: Bearer <your-key>`
- Body: `{ "apiKey": "<your-key>", ... }` (alongside lead fields)

**Request body (JSON):**

| Field                   | Required | Description             |
| ----------------------- | -------- | ----------------------- |
| `sourceWebsite`         | Yes      | Source website URL      |
| `rawTitle`              | Yes      | Deal/listing title      |
| `rawDescription`        | No       | Description             |
| `rawIndustry`           | No       | Industry                |
| `revenue`               | No       | Revenue (number)        |
| `ebitda`                | No       | EBITDA (number)         |
| `askingPrice`           | No       | Asking price (number)   |
| `brokerage`             | No       | Brokerage name          |
| `brokerFirstName`       | No       | Broker first name       |
| `brokerLastName`        | No       | Broker last name        |
| `brokerEmail`           | No       | Broker email            |
| `brokerPhone`           | No       | Broker phone            |
| `normalizedCompanyName` | No       | Normalized company name |
| `companyLocation`       | No       | Company location        |
| `externalListingId`     | No       | External listing ID     |

**Example:**

```bash
curl -X POST "https://dealflow.darkalphacapital.com/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "X-GTM-API-Key: YOUR_GTM_LEADS_API_KEY" \
  -d '{"sourceWebsite":"https://example.com","rawTitle":"Manufacturing Co - $5M Revenue"}'
```

**Setup:** Set `GTM_LEADS_API_KEY` in `.env` and share the value with GTM engineers.

---

### Investor Leads Ingest API

Internal endpoint for submitting investor leads from external sources (e.g., events, referrals, LinkedIn).

**Endpoint:** `POST /api/investor-leads/ingest` (full URL: `{NEXT_PUBLIC_APP_URL}/api/investor-leads/ingest`)

**Authentication:** Provide the shared API key via one of:

- Header: `X-Investor-Leads-Api-Key: <your-key>`
- Header: `Authorization: Bearer <your-key>`
- Body: `{ "apiKey": "<your-key>", ... }` (alongside lead fields)

**Request body (JSON):**

| Field          | Required | Description                                                                  |
| -------------- | -------- | ---------------------------------------------------------------------------- |
| `name`         | No       | Lead or contact name                                                         |
| `source`       | No       | Source (e.g., linkedin, referral, event)                                     |
| `email`        | No       | Email address                                                                |
| `phone`        | No       | Phone number                                                                 |
| `inferredType` | No       | Inferred investor type (e.g., HNWI, family_office)                           |
| `notes`        | No       | Additional notes                                                             |
| `status`       | No       | Pipeline status: RAW, CONTACTED, ENGAGED, QUALIFIED, REJECTED (default: RAW) |

**Example:**

```bash
curl -X POST "https://dealflow.darkalphacapital.com/api/investor-leads/ingest" \
  -H "Content-Type: application/json" \
  -H "X-Investor-Leads-Api-Key: YOUR_INVESTOR_LEADS_API_KEY" \
  -d '{"name":"Jane Smith","source":"linkedin","email":"jane@example.com","notes":"Met at LP conference"}'
```

**Setup:** Set `INVESTOR_LEADS_API_KEY` in `.env` and share the value with authorized integrations.
