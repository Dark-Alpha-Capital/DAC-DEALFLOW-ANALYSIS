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

---

### Deal Opportunities Quick Add API

Internal endpoint for GTM engineers to quickly create a minimal deal opportunity + company record (same semantics as the in-app “Quick add deal” flow).

**Endpoint:** `POST /api/deal-opportunities/quick-add` (full URL: `{NEXT_PUBLIC_APP_URL}/api/deal-opportunities/quick-add`)

**Authentication:** Provide the shared API key via one of:

- Header: `X-Deal-Quick-Add-Api-Key: <your-key>`
- Header: `Authorization: Bearer <your-key>`
- Body: `{ "apiKey": "<your-key>", ... }` (alongside deal fields)

**Request body (JSON):**

| Field           | Required | Description                                                    |
| --------------- | -------- | -------------------------------------------------------------- |
| `dealTeaser`    | Yes      | Short deal title / teaser (used to derive the company name)   |
| `sourceWebsite` | No       | Listing or source URL                                          |
| `brokerage`     | No       | Brokerage name                                                 |
| `revenue`       | No       | Revenue (number, e.g. `1500000`)                              |
| `ebitda`        | No       | EBITDA (number)                                                |
| `ebitdaMargin`  | No       | EBITDA margin as a decimal (e.g. `0.2` for 20%)               |
| `askingPrice`   | No       | Asking price (number)                                         |
| `description`   | No       | Freeform description of the deal                              |
| `brokerFirstName` | No     | Broker first name                                              |
| `brokerLastName`  | No     | Broker last name                                               |
| `brokerEmail`     | No     | Broker email (must be a valid email format if provided)       |
| `brokerPhone`     | No     | Broker phone number                                            |
| `brokerLinkedIn`  | No     | Broker LinkedIn URL or profile slug                           |

**Response (201 Created):**

```json
{
  "dealOpportunityId": "<deal-opportunity-id>",
  "companyId": "<company-id>"
}
```

**Example:**

```bash
curl -X POST "{NEXT_PUBLIC_APP_URL}/api/deal-opportunities/quick-add" \
  -H "Content-Type: application/json" \
  -H "X-Deal-Quick-Add-Api-Key: YOUR_DEAL_QUICK_ADD_API_KEY" \
  -d '{
    "dealTeaser": "Manufacturing Co - $5M Revenue",
    "sourceWebsite": "https://example.com/listing/123",
    "brokerage": "Example Brokers",
    "revenue": 5000000,
    "ebitda": 1000000,
    "ebitdaMargin": 0.2,
    "askingPrice": 8000000,
    "description": "Profitable manufacturing company with diversified customer base"
  }'
```

**Setup:** Set `DEAL_QUICK_ADD_API_KEY` in `.env` and share the value only with authorized GTM engineers and workflows.
