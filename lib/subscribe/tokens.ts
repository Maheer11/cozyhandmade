import { createHash, randomBytes } from "node:crypto";

// One-time tokens for the confirm / unsubscribe links (docs/DESIGN.md §8).
// Only the SHA-256 hash is stored, so a leaked database row can't be used to
// confirm or unsubscribe anyone; the raw token only ever lives in the email.

export const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;
/** A pending address gets at most one new confirmation email per 10 min. */
export const RESEND_THROTTLE_MS = 10 * 60 * 1000;

/** 32 random bytes, URL-safe (43 chars). */
export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Cheap shape check before touching the database. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function isExpired(expiresAt: string | Date | null | undefined, now: Date): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= now.getTime();
}
