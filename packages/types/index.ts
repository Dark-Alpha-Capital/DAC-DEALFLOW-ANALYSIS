export type TransformedDeal = {
  brokerage: string;
  firstName?: string;
  lastName?: string;
  linkedinUrl?: string;
  email?: string;
  workPhone?: string;
  dealCaption: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  industry: string;
  sourceWebsite: string;
  companyLocation?: string;
};

export type EvalOptions = {
  userPrompt?: string;
  sections?: string[];
  tone?: "bullet" | "narrative";
  detailLevel?: "short" | "deep";
  scale?: "0-100" | "0-10";
  language?: string;
  format?: "markdown" | "json";
  framework?: "swot" | "porter";
  temperature?: number;
};

export type BitrixDealGET = {
  id: string;
  dealCaption: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  askingPrice?: number;
  sourceWebsite: string;
  companyLocation?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  linkedinUrl?: string;
  workPhone?: string;
  brokerage: string;
  dealType: "MANUAL";
};

export type DealScreenersGET =
  | {
      id: string;
      name: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  | null;
