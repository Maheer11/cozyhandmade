// Resend Contacts + Segments over plain fetch (no SDK, like lib/email.ts).
// API checked against the Resend docs on 2026-11-15:
//   GET    /contacts/{id_or_email}                      → { id, email, unsubscribed, … }
//   POST   /contacts  { email, unsubscribed, segments:[{id}] }
//   PATCH  /contacts/{id_or_email} { unsubscribed }
//   POST   /contacts/{id_or_email}/segments/{segment_id}
// Every request sends a User-Agent (Resend answers 403/1010 without one).
// Nothing here throws: each call returns a result.
//
// Env (server only):
//   RESEND_CONTACTS_API_KEY  full-access key (falls back to RESEND_API_KEY)
//   RESEND_SEGMENT_ID        the "cozi newsletter" segment

const API = "https://api.resend.com";
const TIMEOUT_MS = 5000;

export interface ResendContact {
  id: string;
  email: string;
  unsubscribed: boolean;
}

export type ContactLookup =
  | { ok: true; contact: ResendContact | null }
  | { ok: false };

export interface ResendContactsClient {
  getContact(email: string): Promise<ContactLookup>;
  /** Creates the contact in the segment, or adds an existing one to it. */
  subscribeToSegment(email: string, existing: ResendContact | null): Promise<{ ok: true; id: string | null } | { ok: false }>;
  setUnsubscribed(email: string): Promise<{ ok: boolean }>;
}

function apiKey(): string | undefined {
  return process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY || undefined;
}

async function call(method: string, path: string, body?: unknown): Promise<Response | null> {
  const key = apiKey();
  if (!key) {
    console.warn("Subscribe: RESEND_CONTACTS_API_KEY / RESEND_API_KEY not configured");
    return null;
  }
  try {
    return await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": "cozihandmade-store",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`Subscribe: Resend ${method} ${path.split("/")[1]} threw:`, err);
    return null;
  }
}

export function createResendContactsClient(): ResendContactsClient {
  const segmentId = process.env.RESEND_SEGMENT_ID;

  return {
    async getContact(email) {
      const res = await call("GET", `/contacts/${encodeURIComponent(email)}`);
      if (!res) return { ok: false };
      if (res.status === 404) return { ok: true, contact: null };
      if (!res.ok) {
        console.error("Subscribe: Resend get contact failed:", res.status);
        return { ok: false };
      }
      const data = (await res.json().catch(() => null)) as Partial<ResendContact> | null;
      if (!data?.id) return { ok: false };
      return { ok: true, contact: { id: data.id, email: data.email ?? email, unsubscribed: !!data.unsubscribed } };
    },

    async subscribeToSegment(email, existing) {
      if (!segmentId) {
        console.error("Subscribe: RESEND_SEGMENT_ID not configured");
        return { ok: false };
      }
      if (existing) {
        const res = await call(
          "POST",
          `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
        );
        if (!res || !res.ok) {
          console.error("Subscribe: Resend add-to-segment failed:", res?.status);
          return { ok: false };
        }
        return { ok: true, id: existing.id };
      }
      const res = await call("POST", "/contacts", { email, unsubscribed: false, segments: [{ id: segmentId }] });
      if (!res || !res.ok) {
        console.error("Subscribe: Resend create contact failed:", res?.status);
        return { ok: false };
      }
      const data = (await res.json().catch(() => null)) as { id?: string } | null;
      return { ok: true, id: data?.id ?? null };
    },

    async setUnsubscribed(email) {
      const res = await call("PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true });
      // 404: no contact in Resend, so nothing to unsubscribe there.
      if (res && (res.ok || res.status === 404)) return { ok: true };
      console.error("Subscribe: Resend unsubscribe failed:", res?.status);
      return { ok: false };
    },
  };
}
