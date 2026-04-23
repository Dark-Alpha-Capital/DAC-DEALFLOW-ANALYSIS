import { createFileRoute } from "@tanstack/react-router";

/** IC scoring moved to Cloudflare Workflows + tRPC (`dealOpportunities.startIcScorerWidgetRun`). */
export const Route = createFileRoute("/api/ic-scorer/score")({
  server: {
    handlers: {
      POST: async () => {
        return Response.json(
          {
            error: "Deprecated",
            message:
              "Use tRPC dealOpportunities.startIcScorerWidgetRun and poll getIcScorerWidgetRunDetail.",
          },
          { status: 410 },
        );
      },
    },
  },
});
