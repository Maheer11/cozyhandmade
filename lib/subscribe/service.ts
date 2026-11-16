// Double opt-in signup (docs/DESIGN.md §8). Server only.
//
//   requestSignup   → pending row + confirmation email (throttled)
//   confirmSignup   → confirmed + Resend contact in the "cozi newsletter"
//                     segment + welcome email with an unsubscribe link
//   unsubscribe     → Resend contact unsubscribed + row unsubscribed
//
// Resend is the source of truth for marketing unsubscribes: a contact Resend
// marks unsubscribed is never re-added here.
//
// Dependencies are injected so tests run on fakes (never production data).

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { normaliseEmail, emailProblem } from "@/lib/intro";
import { createResendContactsClient, type ResendContactsClient } from "./resend-contacts";
import { confirmationEmail, welcomeEmail, type EmailParts } from "./emails";
import { CONFIRM_TTL_MS, RESEND_THROTTLE_MS, createToken, hashToken, isExpired, looksLikeToken } from "./tokens";

export type SignupSource = "intro" | "newsletter";

/** What each form shows next to its button; stored with the consent. */
export const CONSENT_TEXT: Record<SignupSource, string> = {
  intro: "Get new collections and restock news from Cozi. Unsubscribe anytime.",
  newsletter: "By subscribing you agree to receive emails from Cozi Handmade.",
};

export interface SubscriberRow {
  id: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  source: string;
  confirm_expires_at: string | null;
  confirm_sent_at: string | null;
}

/** The few queries this module needs, so tests can fake them. */
export interface SubscriberStore {
  findByEmail(email: string): Promise<SubscriberRow | null>;
  findByConfirmHash(hash: string): Promise<SubscriberRow | null>;
  findByUnsubscribeHash(hash: string): Promise<SubscriberRow | null>;
  insert(row: Record<string, unknown>): Promise<void>;
  update(id: string, patch: Record<string, unknown>): Promise<void>;
}

export interface SubscribeDeps {
  store: SubscriberStore;
  resend: ResendContactsClient;
  send: (email: { to: string; parts: EmailParts; headers?: Record<string, string> }) => Promise<boolean>;
  siteUrl: string;
  now: () => Date;
}

export class SubscribeUnavailable extends Error {}

/* ── Signup ─────────────────────────────────────────────────────────────── */

export type SignupResult = { ok: true } | { ok: false; reason: "invalid_email" | "unavailable" };

/**
 * Always { ok: true } for a valid address, whatever its state, so the forms
 * never reveal whether someone is already on the list.
 */
export async function requestSignup(
  rawEmail: string,
  source: SignupSource,
  deps: SubscribeDeps,
): Promise<SignupResult> {
  if (emailProblem(rawEmail)) return { ok: false, reason: "invalid_email" };
  const email = normaliseEmail(rawEmail);
  const now = deps.now();

  let row: SubscriberRow | null;
  try {
    row = await deps.store.findByEmail(email);
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  // Already confirmed: nothing to send, nothing to reveal.
  if (row?.status === "confirmed") return { ok: true };

  // Pending and emailed in the last 10 minutes: don't send again yet.
  if (row?.status === "pending" && row.confirm_sent_at) {
    const since = now.getTime() - new Date(row.confirm_sent_at).getTime();
    if (since < RESEND_THROTTLE_MS) return { ok: true };
  }

  const token = createToken();
  const fields = {
    confirm_token_hash: hashToken(token),
    confirm_expires_at: new Date(now.getTime() + CONFIRM_TTL_MS).toISOString(),
    confirm_sent_at: now.toISOString(),
  };

  try {
    if (!row) {
      await deps.store.insert({
        email,
        status: "pending",
        source,
        consent_text: CONSENT_TEXT[source],
        consent_at: now.toISOString(),
        ...fields,
      });
    } else if (row.status === "pending") {
      // New link; the previous one stops working.
      await deps.store.update(row.id, fields);
    } else {
      // Previously unsubscribed and signing up again: fresh consent. Whether
      // Resend still has them unsubscribed is checked at confirm time.
      await deps.store.update(row.id, {
        status: "pending",
        source,
        consent_text: CONSENT_TEXT[source],
        consent_at: now.toISOString(),
        unsubscribe_token_hash: null,
        ...fields,
      });
    }
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const confirmUrl = `${deps.siteUrl}/subscribe/confirm?token=${token}`;
  await deps.send({ to: email, parts: confirmationEmail(deps.siteUrl, confirmUrl) });
  return { ok: true };
}

/* ── Confirm ────────────────────────────────────────────────────────────── */

export type ConfirmResult =
  | { kind: "confirmed" }
  /** Unknown, or already used (the hash is cleared once confirmed). */
  | { kind: "invalid" }
  | { kind: "expired"; email: string }
  /** Resend has them unsubscribed: we don't re-add them (source of truth). */
  | { kind: "blocked" }
  | { kind: "error" };

export async function confirmSignup(token: unknown, deps: SubscribeDeps): Promise<ConfirmResult> {
  if (!looksLikeToken(token)) return { kind: "invalid" };
  const now = deps.now();

  let row: SubscriberRow | null;
  try {
    row = await deps.store.findByConfirmHash(hashToken(token));
  } catch {
    return { kind: "error" };
  }
  if (!row || row.status !== "pending") return { kind: "invalid" };
  if (isExpired(row.confirm_expires_at, now)) return { kind: "expired", email: row.email };

  const lookup = await deps.resend.getContact(row.email);
  if (!lookup.ok) return { kind: "error" }; // token stays valid: they can retry

  if (lookup.contact?.unsubscribed) {
    try {
      await deps.store.update(row.id, {
        status: "unsubscribed",
        unsubscribed_at: now.toISOString(),
        confirm_token_hash: null,
        confirm_expires_at: null,
      });
    } catch {
      /* the important part is not re-subscribing */
    }
    return { kind: "blocked" };
  }

  const added = await deps.resend.subscribeToSegment(row.email, lookup.contact);
  if (!added.ok) return { kind: "error" };

  const unsubscribeToken = createToken();
  try {
    await deps.store.update(row.id, {
      status: "confirmed",
      confirmed_at: now.toISOString(),
      confirm_token_hash: null, // one-time
      confirm_expires_at: null,
      unsubscribe_token_hash: hashToken(unsubscribeToken),
      unsubscribed_at: null,
      resend_contact_id: added.id,
    });
  } catch {
    return { kind: "error" };
  }

  const unsubscribeUrl = unsubscribeLink(deps.siteUrl, unsubscribeToken);
  await deps.send({
    to: row.email,
    parts: welcomeEmail(deps.siteUrl, unsubscribeUrl),
    headers: listUnsubscribeHeaders(deps.siteUrl, unsubscribeToken),
  });
  return { kind: "confirmed" };
}

/* ── Unsubscribe ────────────────────────────────────────────────────────── */

export type UnsubscribeResult = { kind: "unsubscribed" } | { kind: "invalid" } | { kind: "error" };

export async function unsubscribe(token: unknown, deps: SubscribeDeps): Promise<UnsubscribeResult> {
  if (!looksLikeToken(token)) return { kind: "invalid" };
  let row: SubscriberRow | null;
  try {
    row = await deps.store.findByUnsubscribeHash(hashToken(token));
  } catch {
    return { kind: "error" };
  }
  if (!row) return { kind: "invalid" };
  if (row.status === "unsubscribed") return { kind: "unsubscribed" }; // idempotent

  // Resend first: it decides who gets Broadcasts.
  const res = await deps.resend.setUnsubscribed(row.email);
  if (!res.ok) return { kind: "error" };
  try {
    await deps.store.update(row.id, { status: "unsubscribed", unsubscribed_at: deps.now().toISOString() });
  } catch {
    /* Resend already stops the emails; the mirror catches up via the webhook */
  }
  return { kind: "unsubscribed" };
}

/** Mirror an unsubscribe that happened in Resend (Broadcast link, webhook). */
export async function markUnsubscribedByEmail(rawEmail: string, deps: Pick<SubscribeDeps, "store" | "now">): Promise<void> {
  const row = await deps.store.findByEmail(normaliseEmail(rawEmail));
  if (!row || row.status === "unsubscribed") return;
  await deps.store.update(row.id, { status: "unsubscribed", unsubscribed_at: deps.now().toISOString() });
}

/* ── Links ──────────────────────────────────────────────────────────────── */

function unsubscribeLink(siteUrl: string, token: string): string {
  return `${siteUrl}/subscribe/unsubscribe?token=${token}`;
}

/** RFC 8058 one-click unsubscribe (Gmail/Apple Mail "Unsubscribe" button). */
function listUnsubscribeHeaders(siteUrl: string, token: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${siteUrl}/api/subscribe/unsubscribe?token=${token}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/* ── Real dependencies ──────────────────────────────────────────────────── */

const COLUMNS = "id, email, status, source, confirm_expires_at, confirm_sent_at";

export function createSupabaseStore(): SubscriberStore {
  // subscribers is newer than lib/supabase/types.ts (migration 018).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const one = async (column: string, value: string) => {
    const { data, error } = await db.from("subscribers").select(COLUMNS).eq(column, value).maybeSingle();
    if (error) throw new SubscribeUnavailable(error.message);
    return (data as SubscriberRow | null) ?? null;
  };
  return {
    findByEmail: (email) => one("email", email),
    findByConfirmHash: (hash) => one("confirm_token_hash", hash),
    findByUnsubscribeHash: (hash) => one("unsubscribe_token_hash", hash),
    async insert(row) {
      const { error } = await db.from("subscribers").insert(row);
      if (error) throw new SubscribeUnavailable(error.message);
    },
    async update(id, patch) {
      const { error } = await db.from("subscribers").update(patch).eq("id", id);
      if (error) throw new SubscribeUnavailable(error.message);
    },
  };
}

/** The sender for signup emails: EMAIL_FROM, e.g. "Cozi Handmade <studio@orders.cozihandmade.com>". */
export function newsletterFrom(): string | undefined {
  return process.env.EMAIL_FROM || undefined;
}

export function siteUrlFrom(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

/** Real dependencies; throws SubscribeUnavailable when Supabase isn't configured. */
export function realDeps(siteUrl: string): SubscribeDeps {
  let store: SubscriberStore;
  try {
    store = createSupabaseStore();
  } catch (err) {
    throw new SubscribeUnavailable(String(err));
  }
  return {
    store,
    resend: createResendContactsClient(),
    siteUrl,
    now: () => new Date(),
    async send({ to, parts, headers }) {
      const from = newsletterFrom();
      if (!from) {
        console.error("Subscribe: EMAIL_FROM not configured — email not sent");
        return false;
      }
      const r = await sendEmail({ to, from, subject: parts.subject, text: parts.text, html: parts.html, headers });
      return r.sent;
    },
  };
}
