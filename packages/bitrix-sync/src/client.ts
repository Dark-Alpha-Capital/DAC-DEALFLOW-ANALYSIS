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
    throw new Error(
      `Bitrix24: HTTP ${status}${typeof data === "string" ? ` — ${data.slice(0, 200)}` : ""}`,
    );
  }
  if (data && typeof data === "object" && "result" in data) {
    return data.result as T;
  }
  throw new Error("Bitrix24: unexpected response shape");
}
