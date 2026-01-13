---
name: Deal Sourcing & Due Diligence Automation Roadmap
overview: Comprehensive long-term plan to transform the current deal sourcing and due diligence platform into an automated, intelligent system integrating n8n workflows, Bitrix24 CRM, Gemini API, and enhanced RAG capabilities for end-to-end deal pipeline automation.
todos:
  - id: n8n-infrastructure
    content: "Set up n8n infrastructure: deploy instance, configure webhooks, create credential management, build webhook receiver endpoints"
    status: pending
  - id: bitrix-bidirectional
    content: "Build bidirectional Bitrix24 sync: extend upload-bitrix.ts, create webhook receiver, add sync reconciliation logic"
    status: pending
  - id: deal-enrichment
    content: "Implement automated deal enrichment: create deal-enrichment queue/handler, build Gemini news scanning, create signals UI"
    status: pending
  - id: deal-scoring
    content: "Build automated deal scoring system: create scoring handler, generate one-pagers, implement ranking algorithm"
    status: pending
  - id: n8n-deal-funnel
    content: "Create n8n workflows for deal funnel automation: ingestion pipeline, status sync, workflow management UI"
    status: pending
  - id: dd-checklist-engine
    content: "Build due diligence checklist engine: create template system, build checklist handler, create checklist UI"
    status: pending
  - id: data-quality-guardrails
    content: "Implement contextual guardrails: enhance RAG prompts, build data quality UI, create quality dashboard"
    status: pending
  - id: source-attribution
    content: "Build source attribution system: enhance document metadata, modify RAG responses, create source viewer UI"
    status: pending
  - id: email-integration
    content: "Integrate email sync: connect Gmail/Outlook, build email monitoring, create n8n email workflow, build email UI"
    status: pending
  - id: document-routing
    content: "Automate document routing: enhance file upload handler for Bitrix24, create routing workflow, build sync status UI"
    status: pending
  - id: automated-reporting
    content: "Build automated reporting system: create report templates, build report generator, create n8n reporting workflow, build report UI"
    status: pending
---

# Deal Sourcing & Due Diligence Automation Roadmap

## Executive Summary

This plan transforms the current platform from a manual deal screening tool into an automated, intelligent deal sourcing and due diligence system. The roadmap integrates n8n for workflow automation, enhances Bitrix24 synchronization, implements automated deal enrichment via Gemini API, and builds advanced due diligence capabilities with source attribution and checklist automation.

## Current State Analysis

### Existing Infrastructure

- **Frontend**: Next.js 16 with App Router, React 19, Better Auth
- **Backend**: Bun worker on Google Cloud Run, BullMQ job queues
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: OpenAI API, Google Gemini API, Pinecone vector search
- **Storage**: Google Cloud Storage, Nextcloud (for file uploads)
- **CRM Integration**: Basic one-way Bitrix24 export (`apps/frontend/lib/actions/upload-bitrix.ts`)

### Current Capabilities

1. **Deal Management**: Manual deal entry, AI-powered screening against custom screeners, deal tagging/review workflow
2. **Due Diligence**: Company management, file uploads with Google File Search Store indexing, basic RAG chat interface
3. **Job Processing**: BullMQ-based background jobs with SSE progress tracking
4. **Bitrix24**: One-way export (deals → Bitrix24), stores `bitrixId` and `bitrixCreatedAt` in database

### Gaps Identified

- No n8n workflow automation
- No automated deal enrichment or news monitoring
- No automated deal scoring/ranking system
- Limited due diligence automation (no checklist engine, no source attribution UI)
- No bidirectional Bitrix24 sync
- No email integration
- No automated document routing to Bitrix24
- No automated reporting/compliance templates

## Phase 1: Foundation & n8n Integration (Months 1-2)

### 1.1 n8n Infrastructure Setup

**Goal**: Establish n8n as the workflow orchestration layer

**Tasks**:

- Deploy n8n instance (self-hosted or cloud) with persistent storage
- Configure n8n webhooks and API access
- Create n8n credential management system in the application
- Build n8n webhook receiver endpoints in `apps/frontend/app/api/n8n/`
  - `/api/n8n/webhook` - Generic webhook receiver
  - `/api/n8n/deal-sync` - Deal sync trigger endpoint
  - `/api/n8n/document-upload` - Document upload trigger endpoint

**Database Changes**:

- Add `n8n_workflows` table to track active workflows
- Add `n8n_executions` table for audit logging
- Add `workflow_triggers` table for event-based workflow activation

**Files to Create**:

- `packages/db/schema.ts` - Add n8n-related tables
- `apps/frontend/lib/n8n/client.ts` - n8n API client
- `apps/frontend/app/api/n8n/**` - Webhook endpoints

### 1.2 Enhanced Bitrix24 Integration

**Goal**: Build bidirectional sync between platform and Bitrix24

**Tasks**:

- Extend `apps/frontend/lib/actions/upload-bitrix.ts` to support:
  - Deal updates (not just creation)
  - Lead creation (for early-stage deals)
  - Company/Contact sync
  - Document attachment to Bitrix24 deals
- Create Bitrix24 webhook receiver (`apps/frontend/app/api/bitrix/webhook/route.ts`)
  - Handle deal updates from Bitrix24
  - Handle status changes
  - Handle comment/activity sync
- Build sync reconciliation logic to handle conflicts
- Add `bitrixLastSyncedAt` and `bitrixSyncStatus` fields to deals table

**Database Changes**:

- Add `bitrix_sync_log` table for tracking sync operations
- Add `bitrix_webhook_events` table for incoming webhook events

**Files to Modify**:

- `apps/frontend/lib/actions/upload-bitrix.ts` - Enhance with update/lead creation
- `packages/db/schema.ts` - Add sync tracking fields
- `apps/frontend/app/api/bitrix/webhook/route.ts` - New webhook receiver

## Phase 2: Automated Sourcing Pipeline (Months 2-4)

### 2.1 Automated Deal Enrichment with Gemini

**Goal**: Automatically scan news sources and enrich deals with "deal signals"

**Tasks**:

- Create new BullMQ queue: `deal-enrichment`
- Build enrichment handler (`apps/worker/handlers/deal-enrichment-handler.ts`):
  - Accepts deal ID and company name
  - Uses Gemini API to search news sources (via web search or news APIs)
  - Detects "deal signals": parent company distress, management changes, M&A rumors, regulatory issues
  - Stores findings in `deal_enrichment_signals` table
- Create n8n workflow:
  - Trigger: New deal created or daily batch job
  - Action: Call enrichment API endpoint
  - Action: If signals found, create Bitrix24 activity/alert
- Build enrichment UI component showing signals on deal detail page

**Database Changes**:

- Add `deal_enrichment_signals` table:
  - `id`, `dealId`, `signalType` (enum: DISTRESS, MANAGEMENT_CHANGE, M_A_RUMOR, REGULATORY, OTHER)
  - `sourceUrl`, `sourceTitle`, `detectedAt`, `confidence` (0-1), `summary`
- Add `deal_enrichment_runs` table for tracking enrichment job executions

**Files to Create**:

- `apps/worker/handlers/deal-enrichment-handler.ts`
- `apps/worker/lib/queues.ts` - Add `DEAL_ENRICHMENT` queue
- `apps/frontend/lib/actions/enrich-deal.ts` - Server action to trigger enrichment
- `apps/frontend/components/deal-detail/deal-signals.tsx` - UI component

### 2.2 Automated Deal Scoring & Ranking

**Goal**: Generate "Investment Committee one-pagers" and rank deals automatically

**Tasks**:

- Create scoring handler (`apps/worker/handlers/deal-scoring-handler.ts`):
  - Takes deal ID and investment thesis (from screeners or firm profile)
  - Uses Gemini API to generate structured one-pager:
    - Executive summary
    - Investment thesis alignment score (0-100)
    - Key strengths/weaknesses
    - Risk assessment
    - Recommendation (PASS, REVIEW, REJECT)
  - Stores in `deal_scores` table
- Build ranking algorithm:
  - Combines AI score, enrichment signals, deal metrics (EBITDA margin, revenue growth)
  - Generates composite score for deal prioritization
- Create n8n workflow:
  - Trigger: Deal screening completed
  - Action: Run scoring job
  - Action: If score > threshold, auto-create Bitrix24 deal with high priority
- Build scoring dashboard showing ranked deals

**Database Changes**:

- Add `deal_scores` table:
  - `id`, `dealId`, `screenerId`, `overallScore` (0-100)
  - `thesisAlignmentScore`, `riskScore`, `recommendation` (enum)
  - `onePagerContent` (JSON), `generatedAt`, `generatedBy` (AI model name)
- Add `deal_rankings` view/materialized table for quick access to ranked deals

**Files to Create**:

- `apps/worker/handlers/deal-scoring-handler.ts`
- `apps/frontend/components/deals/ranking-dashboard.tsx`
- `apps/frontend/app/(protected)/deals/rankings/page.tsx`

### 2.3 n8n-Powered Deal Funnel Automation

**Goal**: Automate the entire deal sourcing funnel from ingestion to Bitrix24

**Tasks**:

- Create n8n workflow: "Deal Ingestion Pipeline"
  - Trigger: Webhook from deal creation API
  - Step 1: Enrich deal (call enrichment API)
  - Step 2: Score deal (call scoring API)
  - Step 3: If score > threshold, create Bitrix24 Lead
  - Step 4: If score > higher threshold, auto-promote to Deal in Bitrix24
  - Step 5: Send notification to assigned team member
- Create n8n workflow: "Deal Status Sync"
  - Trigger: Bitrix24 webhook (deal status changed)
  - Action: Update deal status in platform
  - Action: If status = "Won", mark deal as `isPublished: true`
- Build workflow management UI in admin panel

**Files to Create**:

- `apps/frontend/app/(protected)/admin/workflows/page.tsx` - Workflow management UI
- `apps/frontend/lib/n8n/workflows.ts` - Workflow definitions and helpers

## Phase 3: Enhanced Due Diligence (Months 4-6)

### 3.1 Due Diligence Checklist Engine

**Goal**: Automate standard PE due diligence checklist reviews

**Tasks**:

- Create checklist template system:
  - Store standard DD checklists (Commercial, Financial, Legal, Tax, Technical, etc.)
  - Each checklist item has: `category`, `question`, `requiredDocuments`, `aiPrompt`
- Build checklist engine (`apps/worker/handlers/dd-checklist-handler.ts`):
  - Takes company ID and checklist template ID
  - For each checklist item:
    - Searches uploaded documents using RAG
    - Uses Gemini to answer checklist question
    - Extracts relevant document sections
    - Flags missing documents
    - Generates confidence score
  - Stores results in `dd_checklist_results` table
- Create n8n workflow:
  - Trigger: New document uploaded to company
  - Action: Re-run relevant checklist items
  - Action: If critical item completed, notify team
- Build checklist UI showing progress, answers, and source documents

**Database Changes**:

- Add `dd_checklist_templates` table:
  - `id`, `name`, `category`, `items` (JSON array of checklist items)
- Add `dd_checklist_results` table:
  - `id`, `companyId`, `templateId`, `itemId`, `answer`, `confidence`, `sourceDocuments` (JSON array with document IDs and excerpts), `status` (PENDING, COMPLETED, BLOCKED), `reviewedBy`, `reviewedAt`
- Add `dd_checklist_runs` table for tracking execution history

**Files to Create**:

- `apps/worker/handlers/dd-checklist-handler.ts`
- `apps/frontend/components/due-diligence/checklist-viewer.tsx`
- `apps/frontend/app/(protected)/companies/[id]/due-diligence/checklist/page.tsx`
- `packages/db/schema.ts` - Add checklist tables

### 3.2 Contextual Guardrails & Data Quality Assessment

**Goal**: Ensure AI insights include data quality warnings and limitations

**Tasks**:

- Enhance RAG chat interface (`apps/frontend/app/api/chat/route.ts`):
  - Modify prompts to instruct Gemini to:
    - Identify data source type (audited financial, management estimate, public filing, etc.)
    - Flag data limitations (outdated, incomplete, estimated)
    - Provide confidence intervals for numerical claims
  - Return structured response with:
    - `answer`: The actual answer
    - `dataQuality`: Object with `sourceType`, `limitations`, `confidence`, `lastUpdated`
    - `sources`: Array of source documents with excerpts
- Build data quality UI component showing warnings inline with answers
- Create data quality dashboard for each company

**Files to Modify**:

- `apps/frontend/app/api/chat/route.ts` - Enhance with data quality prompts
- `apps/frontend/components/due-diligence/data-quality-badge.tsx` - New component
- `apps/frontend/components/due-diligence/chat-interface.tsx` - Enhance to show data quality

### 3.3 Source Attribution System

**Goal**: Show exact source location (document + sentence) for every AI conclusion

**Tasks**:

- Enhance Google File Search Store integration:
  - When uploading documents, ensure metadata includes:
    - Page numbers (for PDFs)
    - Section headers
    - Document structure
  - Store document structure in `file_metadata` JSON field
- Modify RAG response handler:
  - Extract source citations from Gemini responses
  - Map citations to actual document locations
  - Store in `ai_response_sources` table
- Build source attribution UI:
  - Side-by-side view: AI answer on left, source documents on right
  - Clickable citations that highlight exact text in source document
  - Document viewer with annotation support
- Create source verification workflow for analysts

**Database Changes**:

- Add `file_metadata` JSON field to `files` table (stores document structure)
- Add `ai_response_sources` table:
  - `id`, `responseId` (references chat message or checklist result), `fileId`, `pageNumber`, `excerpt`, `startChar`, `endChar`, `confidence`
- Add `document_annotations` table for user-added notes on sources

**Files to Create**:

- `apps/frontend/components/due-diligence/source-viewer.tsx`
- `apps/frontend/components/due-diligence/citation-highlighter.tsx`
- `apps/frontend/app/(protected)/companies/[id]/due-diligence/sources/page.tsx`

## Phase 4: Workflow Automation (Months 6-8)

### 4.1 Email Integration & Sync

**Goal**: Automatically sync email interactions with target companies to Bitrix24

**Tasks**:

- Integrate email providers (Gmail/Outlook):
  - Use OAuth2 for email API access
  - Store credentials securely in `email_accounts` table
- Create email monitoring service:
  - Poll email accounts for new messages
  - Use Gemini to classify emails (deal-related, due diligence, general)
  - Extract company/deal references from email content
  - Link emails to deals/companies in database
- Build n8n workflow: "Email to Bitrix24 Sync"
  - Trigger: New email detected (webhook or polling)
  - Action: Classify email and extract entities
  - Action: Create Bitrix24 activity/timeline entry
  - Action: If email contains document, trigger document upload workflow
- Build email UI showing email thread in deal/company context

**Database Changes**:

- Add `email_accounts` table:
  - `id`, `userId`, `provider` (GMAIL, OUTLOOK), `email`, `accessToken`, `refreshToken`, `expiresAt`
- Add `emails` table:
  - `id`, `emailAccountId`, `messageId`, `threadId`, `subject`, `from`, `to`, `cc`, `body`, `receivedAt`, `dealId`, `companyId`, `bitrixActivityId`
- Add `email_attachments` table for tracking email attachments

**Files to Create**:

- `apps/worker/handlers/email-sync-handler.ts`
- `apps/frontend/lib/email/gmail-client.ts` and `outlook-client.ts`
- `apps/frontend/app/(protected)/companies/[id]/emails/page.tsx`
- `apps/frontend/components/emails/email-thread.tsx`

### 4.2 Automated Document Routing

**Goal**: Automatically route uploaded documents to Bitrix24 deal folders

**Tasks**:

- Enhance file upload handler (`apps/worker/handlers/file-upload-handler.ts`):
  - After Google File Search Store upload, check if company has linked Bitrix24 deal
  - If yes, upload document to Bitrix24 deal folder via API
  - Store Bitrix24 document ID in `files.bitrixDocumentId` field
- Create n8n workflow: "Document Upload Pipeline"
  - Trigger: File upload completed
  - Action: Extract document metadata (type, category)
  - Action: Upload to Bitrix24 if deal linked
  - Action: Trigger DD checklist re-run if relevant
  - Action: Notify team if critical document uploaded
- Build document sync status UI showing which documents are synced

**Database Changes**:

- Add `bitrixDocumentId` field to `files` table
- Add `document_sync_log` table for tracking sync operations

**Files to Modify**:

- `apps/worker/handlers/file-upload-handler.ts` - Add Bitrix24 upload step
- `apps/frontend/components/files/document-sync-status.tsx` - New component

### 4.3 Automated Reporting & Compliance

**Goal**: Generate standardized compliance reports (ILPA templates, etc.) automatically

**Tasks**:

- Create report template system:
  - Store report templates (ILPA, LP updates, investment memos)
  - Templates use Handlebars/Mustache with data placeholders
- Build report generator (`apps/worker/handlers/report-generator-handler.ts`):
  - Takes company ID, report template ID, date range
  - Aggregates data from:
    - Company profile
    - Due diligence sections
    - Checklist results
    - Financial documents (extracted via AI)
    - Reviews and tasks
  - Uses Gemini to generate narrative sections
  - Formats as PDF/Word document
  - Stores in `reports` table
- Create n8n workflow: "Monthly LP Report"
  - Trigger: Scheduled (monthly)
  - Action: Generate report for each active company
  - Action: Email reports to LPs
  - Action: Store in Bitrix24 document library
- Build report management UI

**Database Changes**:

- Add `report_templates` table:
  - `id`, `name`, `type` (ILPA, LP_UPDATE, INVESTMENT_MEMO), `templateContent` (JSON/Handlebars), `sections` (JSON array)
- Add `reports` table:
  - `id`, `companyId`, `templateId`, `generatedAt`, `generatedBy`, `fileUrl`, `status` (DRAFT, FINAL, SENT)
- Add `report_recipients` table for tracking who received reports

**Files to Create**:

- `apps/worker/handlers/report-generator-handler.ts`
- `apps/frontend/lib/reports/templates.ts` - Report template definitions
- `apps/frontend/app/(protected)/companies/[id]/reports/page.tsx`
- `apps/frontend/components/reports/report-viewer.tsx`

## Phase 5: Advanced Features & Optimization (Months 8-12)

### 5.1 Intelligent Deal Matching

**Goal**: Use AI to match deals with investment criteria and suggest rollup opportunities

**Tasks**:

- Enhance rollup search (`apps/frontend/lib/rollup/assist-rollup.ts`):
  - Use Gemini to understand deal descriptions semantically
  - Match deals based on business model, customer base, geography
  - Score matches and rank by compatibility
- Build rollup suggestion UI showing matched deals with reasoning

### 5.2 Predictive Analytics

**Goal**: Predict deal success probability and timeline

**Tasks**:

- Build ML model (or use Gemini) to predict:
  - Deal close probability
  - Expected timeline to close
  - Risk factors
- Create analytics dashboard showing predictions

### 5.3 Advanced Search & Discovery

**Goal**: Semantic search across all deals, companies, documents, and communications

**Tasks**:

- Implement unified vector search:
  - Index deals, companies, documents, emails in single Pinecone index
  - Build semantic search API
- Create advanced search UI with filters and AI-powered query understanding

## Technical Architecture Decisions

### n8n Integration Pattern

- **Webhook-based**: n8n workflows triggered via HTTP webhooks from the application
- **API-based**: Application calls n8n API to start workflows programmatically
- **Event-driven**: Use Redis pub/sub or BullMQ events to trigger n8n workflows

### Bitrix24 Sync Strategy

- **Bidirectional sync**: Use webhooks for real-time updates from Bitrix24
- **Conflict resolution**: Last-write-wins with manual override option
- **Sync queue**: Use BullMQ queue for reliable sync operations

### Data Quality & Attribution

- **Source tracking**: Every AI response includes source document IDs and excerpts
- **Confidence scoring**: All AI outputs include confidence scores
- **Audit trail**: All AI operations logged for compliance

## Implementation Priorities

**High Priority (Months 1-4)**:

1. n8n infrastructure setup
2. Enhanced Bitrix24 bidirectional sync
3. Automated deal enrichment
4. Deal scoring & ranking

**Medium Priority (Months 4-8)**:

5. Due diligence checklist engine
6. Source attribution system
7. Email integration
8. Document routing automation

**Lower Priority (Months 8-12)**:

9. Automated reporting
10. Predictive analytics
11. Advanced search

## Success Metrics

- **Deal Processing Time**: Reduce from manual hours to <5 minutes per deal
- **Due Diligence Efficiency**: 50% reduction in time to complete DD checklist
- **Data Quality**: 100% of AI responses include source attribution
- **Automation Rate**: 80% of deals flow through automated pipeline without manual intervention
- **Bitrix24 Sync**: <1 minute latency for bidirectional sync

## Risk Mitigation

- **n8n Reliability**: Implement fallback workflows and error handling
- **API Rate Limits**: Implement rate limiting and queuing for external APIs
- **Data Privacy**: Ensure all external integrations comply with data privacy regulations
- **Cost Management**: Monitor AI API usage and implement caching where possible
