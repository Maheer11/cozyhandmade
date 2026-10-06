// Newsletter sign-ups go to Resend Contacts (the same provider that sends
// order emails), into the segment newsletters ("Broadcasts") are sent to.
// Like lib/email.ts, nothing here throws: every path returns a result.
//
// Configuration (server-only environment variables):
//   RESEND_CONTACTS_API_KEY       A Resend key with FULL access. The order
//                                 email key is usually "sending access",
//                                 which Resend doesn't allow to add contacts.
//                                 Falls back to RESEND_API_KEY if unset.
//   RESEND_NEWSLETTER_SEGMENT_ID  The segment ("Newsletter") new subscribers
//                                 join. Optional: without it they're added
//                                 as contacts with no segment.

const RESEND_CONTACTS_URL = "https://api.resend.com/contacts";
const TIMEOUT_MS = 5000;

export type NewsletterResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; reason: "not_configured" | "provider_error" };

export async function addNewsletterSubscriber(email: string): Promise<NewsletterResult> {
  const apiKey = process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("Newsletter: RESEND_CONTACTS_API_KEY / RESEND_API_KEY not configured — sign-up not saved");
    return { ok: false, reason: "not_configured" };
  }
  const segmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;

  try {
    const res = await fetch(RESEND_CONTACTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { ok: true, alreadySubscribed: false };

    const body = await res.text();
    // Signing up twice isn't a failure for the customer: they're on the list.
    if ((res.status === 409 || res.status === 422) && /already/i.test(body)) {
      return { ok: true, alreadySubscribed: true };
    }
    // 401/403 here usually means the key is "sending access" only.
    console.error("Newsletter: Resend contact create failed:", res.status, body);
    return { ok: false, reason: "provider_error" };
  } catch (err) {
    console.error("Newsletter: Resend contact request threw:", err);
    return { ok: false, reason: "provider_error" };
  }
}
