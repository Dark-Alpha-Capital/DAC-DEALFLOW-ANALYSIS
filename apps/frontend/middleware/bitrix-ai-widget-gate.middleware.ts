import { createMiddleware } from "@tanstack/react-start";
import { auth } from "@/auth";
import {
  BITRIX_AI_EXTRACT_API_PATH,
  BITRIX_AI_WIDGET_PAGE_PATH,
  BITRIX_SCREENING_WIDGET_PAGE_PATH,
  isAiBitrixExtractRequestAllowed,
  isBitrixWidgetPageRequestAllowed,
  isBitrixAiWidgetGatePath,
  isLocalDevWidgetRequest,
  bitrixWidgetForbiddenHtml,
  readBitrixWidgetAuthParams,
  verifyBitrixAuthId,
} from "@/lib/server/bitrix-ai-widget-gate";

async function hasValidAppSession(request: Request): Promise<boolean> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user != null;
}

/**
 * Restricts `/deal-opportunities/ai-bitrix` and the public extract API:
 * Bitrix24 widget auth (AUTH_ID + user.current) or signed-in app user. Other routes unchanged.
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
      const allowed =
        (await hasValidAppSession(request)) ||
        isAiBitrixExtractRequestAllowed(request);
      if (!allowed) {
        return new Response(
          JSON.stringify({
            error:
              "Forbidden: sign in, open from Bitrix24, or use this app origin",
          }),
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

    if (
      norm === BITRIX_AI_WIDGET_PAGE_PATH ||
      norm === BITRIX_SCREENING_WIDGET_PAGE_PATH
    ) {
      if (await hasValidAppSession(request)) {
        return next();
      }
      if (isBitrixWidgetPageRequestAllowed(request)) {
        return next();
      }
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
