import { timingSafeEqual } from "crypto";

/**
 * Validates a request against a shared-secret API key.
 *
 * The key may arrive via a custom header, `Authorization: Bearer <key>`,
 * or a JSON `apiKey` body field. Comparison is timing-safe and constant-time
 * w.r.t. length. Returns false if no expected key is configured.
 *
 * Interface: one boolean in, everything about key extraction and comparison
 * hidden behind it. Used by the internal ingest endpoints.
 */
export function isAuthorizedByApiKey(
  request: Request,
  body: Record<string, unknown>,
  headerName: string,
  expected: string | undefined,
): boolean {
  if (!expected) return false;
  const provided = getApiKeyFromRequest(request, body, headerName);
  if (!provided || provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(provided, "utf8"),
      Buffer.from(expected, "utf8"),
    );
  } catch {
    return false;
  }
}

function getApiKeyFromRequest(
  request: Request,
  body: Record<string, unknown>,
  headerName: string,
): string | null {
  const header = request.headers.get(headerName);
  if (header) return header;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  if (body && typeof body.apiKey === "string") return body.apiKey;

  return null;
}
