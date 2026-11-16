import { NextResponse } from "next/server";
import { markUnsubscribedByEmail, createSupabaseStore } from "@/lib/subscribe/service";
import { unsubscribedEmailFromEvent, verifyResendWebhook } from "@/lib/subscribe/webhook";

// Resend → our subscribers table. When someone unsubscribes from a Broadcast
// (Resend's own {{{RESEND_UNSUBSCRIBE_URL}}} page), Resend sends
// contact.updated with unsubscribed: true; we mirror it so the table matches
// Resend, which stays the source of truth.
//
// Setup (Resend dashboard → Webhooks): endpoint https://<site>/api/webhooks/resend,
// events contact.updated + contact.deleted; put the signing secret in
// RESEND_WEBHOOK_SECRET.

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await request.text();
  const valid = verifyResendWebhook(
    raw,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    secret,
  );
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = unsubscribedEmailFromEvent(event);
  if (email) {
    try {
      await markUnsubscribedByEmail(email, { store: createSupabaseStore(), now: () => new Date() });
    } catch (err) {
      // 500 makes Resend retry later.
      console.error("Resend webhook: could not mirror unsubscribe:", err);
      return NextResponse.json({ error: "Try again" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
