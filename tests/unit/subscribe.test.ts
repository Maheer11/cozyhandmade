// Double opt-in signup (lib/subscribe). Everything runs on in-memory fakes:
// no Supabase, no Resend, no emails sent.
import { describe, it, expect, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  confirmSignup,
  requestSignup,
  unsubscribe,
  markUnsubscribedByEmail,
  CONSENT_TEXT,
  type SubscribeDeps,
  type SubscriberRow,
  type SubscriberStore,
} from "@/lib/subscribe/service";
import { createToken, hashToken, isExpired, looksLikeToken, CONFIRM_TTL_MS } from "@/lib/subscribe/tokens";
import { confirmationEmail, welcomeEmail } from "@/lib/subscribe/emails";
import { unsubscribedEmailFromEvent, verifyResendWebhook } from "@/lib/subscribe/webhook";
import { normaliseEmail, emailProblem } from "@/lib/intro";
import { createRateLimiter } from "@/lib/rate-limit";
import type { ResendContact, ResendContactsClient } from "@/lib/subscribe/resend-contacts";

const SITE = "https://cozihandmade.com";

/* ── Fakes ─────────────────────────────────────────────────────────────── */

type Row = SubscriberRow & Record<string, unknown>;

function fakeStore() {
  const rows: Row[] = [];
  const store: SubscriberStore = {
    async findByEmail(email) { return rows.find((r) => r.email === email) ?? null; },
    async findByConfirmHash(h) { return rows.find((r) => r.confirm_token_hash === h) ?? null; },
    async findByUnsubscribeHash(h) { return rows.find((r) => r.unsubscribe_token_hash === h) ?? null; },
    async insert(row) { rows.push({ id: `id-${rows.length + 1}`, ...row } as Row); },
    async update(id, patch) { Object.assign(rows.find((r) => r.id === id)!, patch); },
  };
  return { rows, store };
}

function fakeResend(initial: ResendContact[] = []) {
  const contacts = new Map(initial.map((c) => [c.email, { ...c }]));
  const inSegment = new Set<string>();
  const client: ResendContactsClient = {
    async getContact(email) { return { ok: true, contact: contacts.get(email) ?? null }; },
    async subscribeToSegment(email, existing) {
      if (!existing) contacts.set(email, { id: `c-${email}`, email, unsubscribed: false });
      inSegment.add(email);
      return { ok: true, id: contacts.get(email)!.id };
    },
    async setUnsubscribed(email) {
      const c = contacts.get(email);
      if (c) c.unsubscribed = true;
      return { ok: true };
    },
  };
  return { contacts, inSegment, client };
}

let now: Date;
let sent: { to: string; subject: string; text: string; html: string; headers?: Record<string, string> }[];
let db: ReturnType<typeof fakeStore>;
let resend: ReturnType<typeof fakeResend>;
let deps: SubscribeDeps;

function setup(contacts: ResendContact[] = []) {
  now = new Date("2026-11-15T12:00:00Z");
  sent = [];
  db = fakeStore();
  resend = fakeResend(contacts);
  deps = {
    store: db.store,
    resend: resend.client,
    siteUrl: SITE,
    now: () => now,
    async send({ to, parts, headers }) {
      sent.push({ to, subject: parts.subject, text: parts.text, html: parts.html, headers });
      return true;
    },
  };
}

/** The raw token from the last email's link. */
function lastLinkToken(kind: "confirm" | "unsubscribe"): string {
  const m = sent.at(-1)!.text.match(new RegExp(`/subscribe/${kind}\\?token=([A-Za-z0-9_-]{43})`));
  return m![1];
}

beforeEach(() => setup());

/* ── Tokens & normalisation ────────────────────────────────────────────── */

describe("tokens", () => {
  it("are random, URL-safe and stored only as a hash", () => {
    const a = createToken();
    const b = createToken();
    expect(a).not.toBe(b);
    expect(looksLikeToken(a)).toBe(true);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toContain(a);
  });
  it("reject malformed tokens", () => {
    expect(looksLikeToken("short")).toBe(false);
    expect(looksLikeToken(undefined)).toBe(false);
    expect(looksLikeToken("x".repeat(42) + "!")).toBe(false);
  });
  it("expire at 48 hours", () => {
    const issued = new Date("2026-11-15T12:00:00Z");
    const expires = new Date(issued.getTime() + CONFIRM_TTL_MS);
    expect(isExpired(expires, new Date(expires.getTime() - 1))).toBe(false);
    expect(isExpired(expires, expires)).toBe(true);
    expect(isExpired(null, issued)).toBe(true);
  });
});

describe("email normalisation", () => {
  it("trims and lower-cases", () => {
    expect(normaliseEmail("  Aoife@Example.COM ")).toBe("aoife@example.com");
  });
  it("explains what to fix", () => {
    expect(emailProblem("")).toMatch(/Enter your email/);
    expect(emailProblem("aoife@")).toMatch(/doesn't look like/);
    expect(emailProblem("aoife@example.com")).toBeNull();
  });
});

describe("rate limit (5 per hour)", () => {
  it("blocks the 6th attempt and frees up after an hour", () => {
    const limiter = createRateLimiter(5, 60 * 60 * 1000);
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(limiter.isLimited("ip", t0 + i)).toBe(false);
    expect(limiter.isLimited("ip", t0 + 10)).toBe(true);
    expect(limiter.isLimited("ip", t0 + 60 * 60 * 1000 + 10)).toBe(false);
  });
});

/* ── Signup ────────────────────────────────────────────────────────────── */

describe("requestSignup", () => {
  it("creates a pending row with a hashed token and sends the confirmation", async () => {
    expect(await requestSignup(" Aoife@Example.com ", "intro", deps)).toEqual({ ok: true });
    expect(db.rows).toHaveLength(1);
    const row = db.rows[0];
    expect(row).toMatchObject({ email: "aoife@example.com", status: "pending", source: "intro", consent_text: CONSENT_TEXT.intro });
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Confirm your place in the Cozi circle");
    const token = lastLinkToken("confirm");
    expect(row.confirm_token_hash).toBe(hashToken(token)); // only the hash is stored
    expect(JSON.stringify(row)).not.toContain(token);
    expect(new Date(row.confirm_expires_at as string).getTime() - now.getTime()).toBe(CONFIRM_TTL_MS);
    expect(resend.inSegment.size).toBe(0); // nobody is added before confirming
  });

  it("rejects an invalid email and stores nothing", async () => {
    expect(await requestSignup("aoife@", "intro", deps)).toEqual({ ok: false, reason: "invalid_email" });
    expect(db.rows).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("re-signup of a pending address resends at most once per 10 minutes", async () => {
    await requestSignup("a@b.co", "intro", deps);
    now = new Date(now.getTime() + 5 * 60 * 1000);
    expect(await requestSignup("a@b.co", "intro", deps)).toEqual({ ok: true });
    expect(sent).toHaveLength(1); // throttled, same answer
    now = new Date(now.getTime() + 6 * 60 * 1000);
    await requestSignup("a@b.co", "intro", deps);
    expect(sent).toHaveLength(2);
    expect(db.rows).toHaveLength(1);
  });

  it("answers the same for an already-confirmed address, without emailing", async () => {
    await requestSignup("a@b.co", "intro", deps);
    await confirmSignup(lastLinkToken("confirm"), deps);
    const before = sent.length;
    expect(await requestSignup("a@b.co", "newsletter", deps)).toEqual({ ok: true });
    expect(sent.length).toBe(before);
  });

  it("reports unavailable when the database can't be read", async () => {
    deps.store.findByEmail = async () => { throw new Error("no table"); };
    expect(await requestSignup("a@b.co", "intro", deps)).toEqual({ ok: false, reason: "unavailable" });
  });
});

/* ── Confirm ───────────────────────────────────────────────────────────── */

describe("confirmSignup", () => {
  it("confirms, adds to the segment, clears the one-time token and sends the welcome", async () => {
    await requestSignup("a@b.co", "newsletter", deps);
    const token = lastLinkToken("confirm");
    expect(await confirmSignup(token, deps)).toEqual({ kind: "confirmed" });
    expect(db.rows[0]).toMatchObject({ status: "confirmed", confirm_token_hash: null });
    expect(resend.inSegment.has("a@b.co")).toBe(true);
    expect(sent.at(-1)!.subject).toMatch(/You're in/);
    expect(sent.at(-1)!.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    // used token can't be used again
    expect(await confirmSignup(token, deps)).toEqual({ kind: "invalid" });
  });

  it("adds an existing Resend contact to the segment instead of creating one", async () => {
    setup([{ id: "c-old", email: "a@b.co", unsubscribed: false }]);
    await requestSignup("a@b.co", "intro", deps);
    await confirmSignup(lastLinkToken("confirm"), deps);
    expect(db.rows[0].resend_contact_id).toBe("c-old");
  });

  it("refuses an expired link and offers a new one", async () => {
    await requestSignup("a@b.co", "intro", deps);
    const token = lastLinkToken("confirm");
    now = new Date(now.getTime() + CONFIRM_TTL_MS + 1);
    expect(await confirmSignup(token, deps)).toEqual({ kind: "expired", email: "a@b.co" });
    expect(resend.inSegment.size).toBe(0);
  });

  it("treats unknown and malformed tokens as invalid", async () => {
    expect(await confirmSignup(createToken(), deps)).toEqual({ kind: "invalid" });
    expect(await confirmSignup("nope", deps)).toEqual({ kind: "invalid" });
  });

  it("never re-subscribes a contact Resend marks unsubscribed", async () => {
    setup([{ id: "c-1", email: "a@b.co", unsubscribed: true }]);
    await requestSignup("a@b.co", "intro", deps);
    expect(await confirmSignup(lastLinkToken("confirm"), deps)).toEqual({ kind: "blocked" });
    expect(resend.inSegment.size).toBe(0);
    expect(resend.contacts.get("a@b.co")!.unsubscribed).toBe(true);
    expect(db.rows[0].status).toBe("unsubscribed");
  });

  it("keeps the link usable when Resend is down", async () => {
    await requestSignup("a@b.co", "intro", deps);
    const token = lastLinkToken("confirm");
    deps.resend = { ...resend.client, getContact: async () => ({ ok: false }) };
    expect(await confirmSignup(token, deps)).toEqual({ kind: "error" });
    deps.resend = resend.client;
    expect(await confirmSignup(token, deps)).toEqual({ kind: "confirmed" });
  });
});

/* ── Unsubscribe ───────────────────────────────────────────────────────── */

describe("unsubscribe", () => {
  async function confirmed() {
    await requestSignup("a@b.co", "intro", deps);
    await confirmSignup(lastLinkToken("confirm"), deps);
    return lastLinkToken("unsubscribe");
  }

  it("updates Resend and the table, and is idempotent", async () => {
    const token = await confirmed();
    expect(await unsubscribe(token, deps)).toEqual({ kind: "unsubscribed" });
    expect(resend.contacts.get("a@b.co")!.unsubscribed).toBe(true);
    expect(db.rows[0].status).toBe("unsubscribed");
    expect(await unsubscribe(token, deps)).toEqual({ kind: "unsubscribed" });
  });

  it("reports an error (and changes nothing) when Resend can't be updated", async () => {
    const token = await confirmed();
    deps.resend = { ...resend.client, setUnsubscribed: async () => ({ ok: false }) };
    expect(await unsubscribe(token, deps)).toEqual({ kind: "error" });
    expect(db.rows[0].status).toBe("confirmed");
  });

  it("rejects unknown tokens", async () => {
    expect(await unsubscribe(createToken(), deps)).toEqual({ kind: "invalid" });
  });

  it("mirrors an unsubscribe made in Resend (webhook)", async () => {
    await confirmed();
    await markUnsubscribedByEmail("A@B.co", deps);
    expect(db.rows[0].status).toBe("unsubscribed");
  });
});

/* ── Emails ────────────────────────────────────────────────────────────── */

describe("emails", () => {
  const confirmUrl = `${SITE}/subscribe/confirm?token=${"t".repeat(43)}`;

  it("confirmation: renders the shell (snapshot) and has a plain-text version with the link", () => {
    const e = confirmationEmail(SITE, confirmUrl);
    expect(e.subject).toBe("Confirm your place in the Cozi circle");
    expect(e.html).toMatchSnapshot();
    expect(e.text).toContain(confirmUrl);
    expect(e.text).toContain("This link expires in 48 hours.");
    expect(e.text).toContain("Didn't sign up? Ignore this email.");
    expect(e.html).toContain('alt="Cozi Handmade"');
    expect(e.html).toContain("One tap and you&#39;ll hear".replace("&#39;", "'")); // preheader
    expect(e.html).toContain("5B Belmayne Avenue");
    expect(e.html).not.toMatch(/<style|display:\s*flex|display:\s*grid/); // client-safe
  });

  it("welcome: has an unsubscribe link in both versions", () => {
    const u = `${SITE}/subscribe/unsubscribe?token=${"u".repeat(43)}`;
    const e = welcomeEmail(SITE, u);
    expect(e.html).toContain(u);
    expect(e.text).toContain(`Unsubscribe: ${u}`);
  });
});

/* ── Webhook ───────────────────────────────────────────────────────────── */

describe("Resend webhook", () => {
  const secretBytes = Buffer.from("test-secret-0123456789");
  const secret = `whsec_${secretBytes.toString("base64")}`;
  const body = JSON.stringify({ type: "contact.updated", data: { email: "a@b.co", unsubscribed: true } });
  const ts = 1_800_000_000;
  const sign = (b: string, t = ts) =>
    "v1," + createHmac("sha256", secretBytes).update(`msg_1.${t}.${b}`).digest("base64");

  it("accepts a correctly signed event", () => {
    expect(verifyResendWebhook(body, { id: "msg_1", timestamp: String(ts), signature: sign(body) }, secret, ts)).toBe(true);
  });
  it("rejects a tampered body, a wrong secret, or an old timestamp", () => {
    expect(verifyResendWebhook(body + " ", { id: "msg_1", timestamp: String(ts), signature: sign(body) }, secret, ts)).toBe(false);
    expect(verifyResendWebhook(body, { id: "msg_1", timestamp: String(ts), signature: sign(body) }, "whsec_d3Jvbmc=", ts)).toBe(false);
    expect(verifyResendWebhook(body, { id: "msg_1", timestamp: String(ts), signature: sign(body) }, secret, ts + 3600)).toBe(false);
  });
  it("picks out unsubscribes only", () => {
    expect(unsubscribedEmailFromEvent(JSON.parse(body))).toBe("a@b.co");
    expect(unsubscribedEmailFromEvent({ type: "contact.updated", data: { email: "a@b.co", unsubscribed: false } })).toBeNull();
    expect(unsubscribedEmailFromEvent({ type: "contact.deleted", data: { email: "a@b.co" } })).toBe("a@b.co");
    expect(unsubscribedEmailFromEvent({ type: "email.sent", data: {} })).toBeNull();
  });
});
