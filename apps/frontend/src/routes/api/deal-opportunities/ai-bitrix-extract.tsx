import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/api/deal-opportunities/ai-bitrix-extract",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { postAiBitrixExtract } =
          await import("@/lib/ai-bitrix-extract.server");
        return postAiBitrixExtract(request);
      },
    },
  },
});
