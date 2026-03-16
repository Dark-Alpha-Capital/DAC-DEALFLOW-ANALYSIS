export type ChatContext = {
  companyId: string | null;
  leadId: string | null;
  dealOpportunityId: string | null;
};

export const EMPTY_CHAT_CONTEXT: ChatContext = {
  companyId: null,
  leadId: null,
  dealOpportunityId: null,
};
