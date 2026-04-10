import { createMiddleware } from "@tanstack/react-start";
import {
  BITRIX_AI_EXTRACT_API_PATH,
  BITRIX_AI_WIDGET_PAGE_PATH,
  isAiBitrixExtractRequestAllowed,
  isBitrixAiWidgetGatePath,
  isLocalDevWidgetRequest,
  bitrixWidgetForbiddenHtml,
  readBitrixWidgetAuthParams,
  verifyBitrixAuthId,
} from "@/lib/server/bitrix-ai-widget-gate";

/**
 * Restricts `/deal-opportunities/ai-bitrix` and the public extract API as documented
 * in Bitrix24 widget auth (AUTH_ID + user.current). Other routes are untouched.
 */
export const bitrixAiWidgetGateRequestMiddleware = createMiddleware().server(
  async ({ request, pathname, next }) => {
    if (!isBitrixAiWidgetGatePath(pathname)) {
      return next();
    }

    if (isLocalDevWidgetRequest(request)) {
      return next();
    }

    const norm = pathname.replace(/\/+$/, "") || "/";
    const isExtract =
      norm === BITRIX_AI_EXTRACT_API_PATH ||
      norm.startsWith(`${BITRIX_AI_EXTRACT_API_PATH}/`);

    if (isExtract) {
      if (!isAiBitrixExtractRequestAllowed(request)) {
        return new Response(
          JSON.stringify({ error: "Forbidden: open from Bitrix24 or this app" }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      }
      return next();
    }

    if (norm === BITRIX_AI_WIDGET_PAGE_PATH) {
      const { authId, domain } = await readBitrixWidgetAuthParams(request);
      if (
        !authId ||
        !domain ||
        !(await verifyBitrixAuthId(authId, domain))
      ) {
        return new Response(bitrixWidgetForbiddenHtml(), {
          status: 403,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
      return next();
    }

    return next();
  },
);
