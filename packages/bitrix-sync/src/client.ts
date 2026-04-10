import axios from "axios";
import { requireBitrixWebhookBase } from "./env";

export type BitrixSuccess<T> = { result: T };
export type BitrixErrorBody = {
  error: string;
  error_description?: string;
};

export async function callBitrix<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
  options?: { webhookBaseUrl?: string },
): Promise<T> {
  const base = options?.webhookBaseUrl ?? requireBitrixWebhookBase();
  const path = method.endsWith(".json") ? method : `${method}.json`;
  const url = `${base}/${path}`;
  /** Bitrix often returns 401/403 with a JSON body (`insufficient_scope`, etc.); axios would throw before we could read it. */
  const { status, data } = await axios.post<
    BitrixSuccess<T> & Partial<BitrixErrorBody>
  >(url, params, {
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
  });

  if (data && typeof data === "object" && "error" in data && data.error) {
    const desc =
      typeof data.error_description === "string"
        ? data.error_description
        : JSON.stringify(data);
    throw new Error(`Bitrix24 (${status}): ${data.error} — ${desc}`);
  }
  if (status >= 400) {
    const raw = data as unknown;
    const snip =
      typeof raw === "string" ? ` — ${raw.slice(0, 200)}` : "";
    throw new Error(`Bitrix24: HTTP ${status}${snip}`);
  }
  if (data && typeof data === "object" && "result" in data) {
    return data.result as T;
  }
  throw new Error("Bitrix24: unexpected response shape");
}

type BitrixListEnvelope<T> = BitrixSuccess<T> &
  Partial<BitrixErrorBody> & {
    total?: number;
    /** Next `start` offset when more rows exist (list-style REST methods). */
    next?: number | string;
  };

/**
 * Fetches all pages of a Bitrix list method (`crm.*.userfield.list`, etc.)
 * using `start` / `next` pagination from the response envelope.
 */
export async function callBitrixListAll<T>(
  method: string,
  baseParams: Record<string, unknown> = {},
  options?: { webhookBaseUrl?: string },
): Promise<T[]> {
  const base = options?.webhookBaseUrl ?? requireBitrixWebhookBase();
  const path = method.endsWith(".json") ? method : `${method}.json`;
  const url = `${base}/${path}`;
  const out: T[] = [];
  let start = 0;

  for (let page = 0; page < 500; page++) {
    const { status, data } = await axios.post<BitrixListEnvelope<T[]>>(
      url,
      { ...baseParams, start },
      {
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      },
    );

    if (data && typeof data === "object" && "error" in data && data.error) {
      const desc =
        typeof data.error_description === "string"
          ? data.error_description
          : JSON.stringify(data);
      throw new Error(`Bitrix24 (${status}): ${data.error} — ${desc}`);
    }
    if (status >= 400) {
      const raw = data as unknown;
      const snip =
        typeof raw === "string" ? ` — ${raw.slice(0, 200)}` : "";
      throw new Error(`Bitrix24: HTTP ${status}${snip}`);
    }
    if (!data || typeof data !== "object" || !("result" in data)) {
      throw new Error("Bitrix24: unexpected response shape");
    }
    const batch = data.result;
    if (!Array.isArray(batch)) {
      throw new Error(`Bitrix24: ${method} result is not an array`);
    }
    out.push(...batch);

    const nextRaw = data.next;
    if (nextRaw == null || nextRaw === "") {
      break;
    }
    const nextStart =
      typeof nextRaw === "number"
        ? nextRaw
        : typeof nextRaw === "string"
          ? Number(nextRaw)
          : NaN;
    if (!Number.isFinite(nextStart)) {
      break;
    }
    start = nextStart;
    if (batch.length === 0) {
      break;
    }
  }

  return out;
}
