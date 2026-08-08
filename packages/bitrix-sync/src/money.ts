const ISO4217 = /^[A-Z]{3}$/;

/** Bitrix money / numeric user fields often return `{ VALUE, CURRENCY }`. */
export function coerceBitrixNumeric(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    let t = v.trim();
    /** Bitrix `money` UF string form: `20000000|USD` */
    if (t.includes("|")) {
      t = t.split("|")[0]!.trim();
    }
    t = t.replace(/^\$\s*/, "").replace(/,/g, "");
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if ("VALUE" in o) {
      return coerceBitrixNumeric(o.VALUE);
    }
  }
  return null;
}

/** Parse Bitrix money UF: `amount|USD` or `{ VALUE, CURRENCY }`. */
export function parseBitrixMoneyParts(
  v: unknown,
): { amount: number; currency: string } | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.includes("|")) {
      const [a, cur] = t.split("|", 2);
      const amount = Number(String(a).replace(/,/g, ""));
      const currency = (cur ?? "USD").trim().toUpperCase();
      if (!Number.isFinite(amount)) return null;
      if (!ISO4217.test(currency)) return { amount, currency: "USD" };
      return { amount, currency };
    }
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const curRaw = o.CURRENCY ?? o.currency;
    if (o.VALUE !== undefined && o.VALUE !== null && curRaw != null) {
      const amount = coerceBitrixNumeric(o.VALUE);
      const currency = String(curRaw).trim().toUpperCase();
      if (amount == null || !Number.isFinite(amount)) return null;
      if (!ISO4217.test(currency)) return { amount, currency: "USD" };
      return { amount, currency };
    }
  }
  const n = coerceBitrixNumeric(v);
  if (n == null || !Number.isFinite(n)) return null;
  return { amount: n, currency: "USD" };
}

/** Format a Bitrix money value (`amount|USD` or `{ VALUE, CURRENCY }`) for display. */
export function formatBitrixMoneyForDisplay(v: unknown): string | null {
  const p = parseBitrixMoneyParts(v);
  if (!p) return null;
  const hasCents = Math.round(p.amount * 100) % 100 !== 0;
  const maxFrac = hasCents ? 2 : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: p.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFrac,
    }).format(p.amount);
  } catch {
    return (
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFrac,
      }).format(p.amount) + " " + p.currency
    );
  }
}
