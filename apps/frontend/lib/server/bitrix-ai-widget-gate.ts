/**
 * Gates the Bitrix-embedded AI → Bitrix widget page and its extract API.
 * - Local dev (localhost / 127.0.0.1): no gate.
 * - Production page load: valid Bitrix AUTH_ID + DOMAIN (user.current), OR signed-in app user.
 * - Production extract: Referer/Origin from Bitrix or same app, OR signed-in app user.
 */

export const BITRIX_AI_WIDGET_PAGE_PATH = "/deal-opportunities/ai-bitrix";
export const BITRIX_AI_EXTRACT_API_PATH =
  "/api/deal-opportunities/ai-bitrix-extract";

const BITRIX_HOST =
  /^(?:[a-z0-9-]+\.)*bitrix24\.(com|ru|de|eu|in|kz|fr|la|co|pl|it|es|com\.br)$/i;

export function isBitrixAiWidgetGatePath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return (
    p === BITRIX_AI_WIDGET_PAGE_PATH ||
    p === BITRIX_AI_EXTRACT_API_PATH ||
    pathname.startsWith(`${BITRIX_AI_EXTRACT_API_PATH}/`)
  );
}

export function isLocalDevWidgetRequest(request: Request): boolean {
  let host: string;
  try {
    host = new URL(request.url).hostname;
  } catch {
    return false;
  }
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  );
}

export function isAllowedBitrixPortalHost(domain: string): boolean {
  const host = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    ?.toLowerCase();
  if (!host) return false;
  return BITRIX_HOST.test(host);
}

export async function verifyBitrixAuthId(
  authId: string,
  domain: string,
): Promise<boolean> {
  const cleanDomain = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0];
  if (!cleanDomain || !isAllowedBitrixPortalHost(cleanDomain)) return false;
  const url = `https://${cleanDomain}/rest/user.current.json?auth=${encodeURIComponent(authId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as {
      error?: string;
      result?: { ID?: string };
    };
    return !data.error && data.result != null;
  } catch {
    return false;
  }
}

/** Query + optional POST x-www-form-urlencoded (Bitrix often POSTs the first load). */
export async function readBitrixWidgetAuthParams(
  request: Request,
): Promise<{ authId?: string; domain?: string }> {
  const url = new URL(request.url);
  let authId =
    url.searchParams.get("AUTH_ID") ??
    url.searchParams.get("auth") ??
    undefined;
  let domain = url.searchParams.get("DOMAIN") ?? undefined;

  if (authId && domain) return { authId, domain };

  if (request.method !== "POST") return { authId, domain };

  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/x-www-form-urlencoded")) {
    return { authId, domain };
  }

  try {
    const clone = request.clone();
    const text = await clone.text();
    const params = new URLSearchParams(text);
    authId = authId ?? params.get("AUTH_ID") ?? params.get("auth") ?? undefined;
    domain = domain ?? params.get("DOMAIN") ?? undefined;
  } catch {
    /* ignore */
  }
  return { authId, domain };
}

function headerHintsBitrixOrApp(request: Request): boolean {
  const ref = request.headers.get("Referer") ?? "";
  const origin = request.headers.get("Origin") ?? "";
  const combined = `${ref}\n${origin}`.toLowerCase();
  if (combined.includes("bitrix24.")) return true;
  let appOrigin: string;
  try {
    appOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }
  if (origin === appOrigin) return true;
  if (ref.startsWith(`${appOrigin}/`)) return true;
  return false;
}

/** POST /api/.../ai-bitrix-extract — no AUTH_ID in JSON body; allow same-app or Bitrix referrers. */
export function isAiBitrixExtractRequestAllowed(request: Request): boolean {
  if (isLocalDevWidgetRequest(request)) return true;
  return headerHintsBitrixOrApp(request);
}

export function bitrixWidgetForbiddenHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access denied</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; color: #111; }
    code { font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Access denied</h1>
  <p>This tool is only available when opened from your Bitrix24 app (widget), when signed in to this site, or on <code>localhost</code> for development.</p>
  <p>If you are embedding it in Bitrix24, ensure the handler URL receives <code>AUTH_ID</code> and <code>DOMAIN</code> from Bitrix (query string or form POST). Otherwise, <a href="/auth/login">sign in</a>.</p>
</body>
</html>`;
}
