import { createHmac, timingSafeEqual } from "crypto";

type SignedBitrixWidgetContext = {
  dealId: string;
  memberId: string;
  expiresAt: number;
  authSig: string;
};

const DEFAULT_MAX_CLOCK_SKEW_MS = 60_000;

function getWidgetSigningSecret(): string | null {
  const v = process.env.BITRIX_WIDGET_SIGNING_SECRET?.trim();
  return v && v.length > 0 ? v : null;
}

function canonicalPayload(ctx: Omit<SignedBitrixWidgetContext, "authSig">): string {
  return `${ctx.dealId}:${ctx.memberId}:${ctx.expiresAt}`;
}

function decodeSigHex(sig: string): Buffer | null {
  if (!/^[a-f0-9]+$/i.test(sig) || sig.length % 2 !== 0) return null;
  try {
    return Buffer.from(sig, "hex");
  } catch {
    return null;
  }
}

export function verifyBitrixWidgetSignature(
  ctx: SignedBitrixWidgetContext,
): { ok: true } | { ok: false; reason: string } {
  const secret = getWidgetSigningSecret();
  if (!secret) {
    return { ok: false, reason: "BITRIX_WIDGET_SIGNING_SECRET is not configured" };
  }

  const now = Date.now();
  if (ctx.expiresAt < now - DEFAULT_MAX_CLOCK_SKEW_MS) {
    return { ok: false, reason: "Signed widget context is expired" };
  }

  const expected = createHmac("sha256", secret)
    .update(
      canonicalPayload({
        dealId: ctx.dealId,
        memberId: ctx.memberId,
        expiresAt: ctx.expiresAt,
      }),
    )
    .digest();

  const provided = decodeSigHex(ctx.authSig.trim());
  if (!provided || provided.length !== expected.length) {
    return { ok: false, reason: "Widget signature is invalid" };
  }
  if (!timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "Widget signature mismatch" };
  }
  return { ok: true };
}
