import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import type { BitrixScreeningWidgetBootstrapPayload } from "@/lib/server/load-bitrix-screening-widget-bootstrap";

export type WidgetBootstrap = BitrixScreeningWidgetBootstrapPayload;

export type DealDocumentRow = WidgetBootstrap["dealDocuments"][number];

export type LastRunAnswer = NonNullable<
  WidgetBootstrap["lastRun"]
>["answers"][number];

export type ScreeningRunDetail = NonNullable<
  inferRouterOutputs<AppRouter>["dealOpportunities"]["getBitrixScreeningWidgetRunDetail"]["run"]
>;

export type IngestionPipelineJobRow = NonNullable<
  WidgetBootstrap["ingestionPipelineJobs"]
>[number];

export type DisplayIngestionPipelineRow = {
  key: string;
  fileName: string | null;
  phaseLabel: string;
  progressStep: string;
  progressPercent: number;
  state: string;
};

export type ScreeningMode = "rag" | "monograph";

export type WizardStep = 1 | 2 | 3;
