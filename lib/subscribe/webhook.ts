import { createHmac, timingSafeEqual } from "node:crypto";

// Resend webhooks are signed with Svix (docs checked 2026-11-15): headers
// svix-id, svix-timestamp, svix-signature; the signed content is
// "{id}.{timestamp}.{raw body}", HMAC-SHA256 with the base64 part of the
// "whsec_…" secret; the header holds space-separated "v1,<base64>" entries.
// Verified by hand so no extra dependency is needed.

const TOLERANCE_SECONDS = 5 * 60;

export function verifyResendWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** The email of a contact that is now unsubscribed (or deleted), else null. */
export function unsubscribedEmailFromEvent(event: unknown): string | null {
  if (typeof event !== "object" || event === null) return null;
  const e = event as { type?: string; data?: { email?: unknown; unsubscribed?: unknown } };
  if (typeof e.data?.email !== "string") return null;
  if (e.type === "contact.deleted") return e.data.email;
  if (e.type === "contact.updated" && e.data.unsubscribed === true) return e.data.email;
  return null;
}
