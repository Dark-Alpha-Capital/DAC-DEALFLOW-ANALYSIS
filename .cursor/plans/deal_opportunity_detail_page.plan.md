---
name: deal-opportunity-detail-page
overview: Extend the deal detail page to display Deal Opportunities list, Contacts (Company vs Deal sections), Outreach, Documents (Company vs Deal sections), and Notes—with separate sections for polymorphic entities.
todos:
  - id: extend-query
    content: Extend GetDealWithAllRelations to fetch company, dealOpps, companyContacts, dealContacts, outreach, companyDocs, dealDocs
    status: completed
  - id: deal-detail-tabs
    content: Create DealDetailTabs with Overview, Deal Opportunities, Contacts (Company/Deal), Outreach, Documents (Company/Deal), Notes
    status: completed
  - id: deal-opps-table
    content: Create DealOpportunitiesTable component
    status: completed
  - id: update-page
    content: Update deal page to use DealDetailTabs when company exists
    status: completed
  - id: contact-doc-forms
    content: Extend CreateContactForm and add dual FileUpload for Company vs Deal entity choice
    status: completed
---

# Deal Opportunity Detail Page

## Design: Separate Sections (Option B)

- **Contacts**: "Company contacts" | "Deal contacts" (separate sections)
- **Documents**: "Company documents" | "Deal documents" (separate sections)
- **Outreach**: Single list (already scoped by dealOppId OR companyId)

## Data Queries

- `companyContacts`: entityType=COMPANY, entityId=companyId
- `dealContacts`: entityType=DEAL_OPPORTUNITY, entityId=dealOppId
- `companyDocuments`: entityType=COMPANY, entityId=companyId
- `dealDocuments`: entityType=DEAL_OPPORTUNITY, entityId=dealOppId
- `outreach`: dealOpportunityId=oppId OR companyId=companyId
