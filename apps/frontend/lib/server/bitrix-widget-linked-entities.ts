import { callBitrix } from "@repo/bitrix-sync";

export type BitrixWidgetLinkedContact = {
  id: string;
  displayName: string;
  email: string | null;
  phones: string | null;
};

export type BitrixWidgetLinkedCompany = {
  id: string;
  title: string;
  email: string | null;
  phones: string | null;
  website: string | null;
  industry: string | null;
};

export type BitrixWidgetLinkedEntities = {
  contact: BitrixWidgetLinkedContact | null;
  company: BitrixWidgetLinkedCompany | null;
};

function normalizeBitrixEntityId(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!s || s === "0") return null;
  return /^\d+$/.test(s) ? s : null;
}

function stringifyBitrixMultiValue(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t || null;
  }
  if (Array.isArray(v)) {
    const parts: string[] = [];
    for (const x of v) {
      if (x && typeof x === "object" && "VALUE" in (x as object)) {
        const val = (x as { VALUE?: unknown }).VALUE;
        if (typeof val === "string" && val.trim()) parts.push(val.trim());
      }
    }
    const s = parts.join(", ").trim();
    return s || null;
  }
  return null;
}

function contactDisplayName(row: Record<string, unknown>): string {
  const parts = [
    typeof row.NAME === "string" ? row.NAME.trim() : "",
    typeof row.LAST_NAME === "string" ? row.LAST_NAME.trim() : "",
    typeof row.SECOND_NAME === "string" ? row.SECOND_NAME.trim() : "",
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return typeof row.FULL_NAME === "string" && row.FULL_NAME.trim()
    ? row.FULL_NAME.trim()
    : "Contact";
}

async function fetchBitrixLinkedContact(
  id: string,
  webhookOpts: { webhookBaseUrl: string },
): Promise<BitrixWidgetLinkedContact | null> {
  try {
    const row = await callBitrix<Record<string, unknown>>(
      "crm.contact.get",
      { id },
      webhookOpts,
    );
    return {
      id,
      displayName: contactDisplayName(row),
      email: stringifyBitrixMultiValue(row.EMAIL),
      phones: stringifyBitrixMultiValue(row.PHONE),
    };
  } catch {
    return null;
  }
}

async function fetchBitrixLinkedCompany(
  id: string,
  webhookOpts: { webhookBaseUrl: string },
): Promise<BitrixWidgetLinkedCompany | null> {
  try {
    const row = await callBitrix<Record<string, unknown>>(
      "crm.company.get",
      { id },
      webhookOpts,
    );
    const title =
      typeof row.TITLE === "string" && row.TITLE.trim()
        ? row.TITLE.trim()
        : `Company ${id}`;
    return {
      id,
      title,
      email: stringifyBitrixMultiValue(row.EMAIL),
      phones: stringifyBitrixMultiValue(row.PHONE),
      website:
        typeof row.WEB === "string" && row.WEB.trim()
          ? row.WEB.trim()
          : typeof row.WEBSITE === "string" && row.WEBSITE.trim()
            ? row.WEBSITE.trim()
            : null,
      industry:
        typeof row.INDUSTRY === "string" && row.INDUSTRY.trim()
          ? row.INDUSTRY.trim()
          : null,
    };
  } catch {
    return null;
  }
}

export async function fetchBitrixWidgetLinkedEntities(
  rawDeal: Record<string, unknown> | null | undefined,
  webhookOpts: { webhookBaseUrl: string },
): Promise<BitrixWidgetLinkedEntities> {
  const contactId = normalizeBitrixEntityId(
    rawDeal?.CONTACT_ID ?? rawDeal?.contactId,
  );
  const companyId = normalizeBitrixEntityId(
    rawDeal?.COMPANY_ID ?? rawDeal?.companyId,
  );
  const [contact, company] = await Promise.all([
    contactId ? fetchBitrixLinkedContact(contactId, webhookOpts) : null,
    companyId ? fetchBitrixLinkedCompany(companyId, webhookOpts) : null,
  ]);
  return {
    contact: contact ?? null,
    company: company ?? null,
  };
}
