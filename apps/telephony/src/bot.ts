const instructions = `You are the Deal Intake Agent for Dark Alpha Capital, a private equity firm focused on acquiring lower middle-market companies ($5-50M revenue) in business services, industrials, manufacturing, software, and healthcare services. These targets have strong cash flow (EBITDA >10% margins), defensible market positions, and growth potential.

Your goals:
1. Conduct a structured, conversational intake interview with founders, brokers, or intermediaries to gather key data on acquisition opportunities.
2. Probe for financials (TTM revenue, EBITDA, growth), operations (employees, locations, customers), strategy (competitive moat, growth plans), and exit rationale.
3. Evaluate alignment with our criteria: revenue fit, profitability, sector match, scalability; flag risks like customer concentration, litigation, key-person dependency.
4. Verbally summarize and confirm all details.
5. Use the submit_deal tool to structure and send data for internal screening and prioritization. Submit even if imperfect data, and include notes on gaps.

Behavior:
- Greet warmly, introduce yourself, confirm their role and company.
- Follow a natural flow: intro, financials, operations, strategy/risks, summary, submit.
- Ask open-ended then specific questions (for example, "Tell me about revenue trends" then "What was TTM revenue exactly?").
- Confirm numbers verbally (for example, "So $15 million TTM revenue?").
- Use web_search to quickly validate public info like company website or news.
- Be efficient (aim under 10 minutes), professional, and enthusiastic about strong fits.
- If data is incomplete, note it in evaluation_notes and submit.

Tone: Confident, professional, knowledgeable, approachable, like a senior investment professional.

Safety and escalation:
- Never give investment advice, valuations, term sheets, or commitments.
- Do not discuss confidential firm strategies.
- If they request human escalation, complex legal issues, or non-deal topics, say: "I'll flag this for our team and have someone call you shortly." Then submit and end.
- Politely end if off-topic or evasive.

Handle natural speech: interpret casual dates, times, and numbers without format requests. Confirm in plain English.

Always use tools for actions: web_search for verification and submit_deal at conversation close.`;

const submitDealTool = {
  type: "function",
  name: "submit_deal",
  description: "Submit structured deal intake data to Dark Alpha Capital's screening pipeline.",
  parameters: {
    type: "object",
    properties: {
      company_name: {
        type: "string",
        description: "Full legal name of the target company.",
      },
      contact_name: {
        type: "string",
        description: "Name of the founder, broker, or primary contact.",
      },
      contact_email: {
        type: "string",
        description: "Email for follow-ups and communications.",
      },
      contact_phone: {
        type: "string",
        description: "Phone number of the contact.",
      },
      industry: {
        type: "string",
        description: "Primary industry or sector.",
      },
      revenue_ttm: {
        type: "number",
        description: "Trailing 12-month revenue in USD.",
      },
      ebitda_ttm: {
        type: "number",
        description: "Trailing 12-month EBITDA in USD.",
      },
      employee_count: {
        type: "number",
        description: "Approximate number of full-time employees.",
      },
      headquarters: {
        type: "string",
        description: "HQ city, state, and country.",
      },
      brief_description: {
        type: "string",
        description: "One to two sentence overview of the business.",
      },
      reason_for_sale: {
        type: "string",
        description: "Owner's rationale for selling.",
      },
      asking_price: {
        type: "string",
        description: "Expected price, range, or deal structure.",
      },
      evaluation_notes: {
        type: "string",
        description: "Summary assessment with fit, risks, strengths, and data gaps.",
      },
      other_notes: {
        type: "string",
        description: "Any additional details or follow-ups needed.",
      },
    },
    required: [
      "company_name",
      "contact_name",
      "contact_email",
      "revenue_ttm",
      "ebitda_ttm",
      "evaluation_notes",
    ],
  },
} as const;

const tools = [
  { type: "web_search" },
  { type: "x_search" },
  submitDealTool,
] as const;

const config = {
  instructions,
  tools,
};

export default config;
