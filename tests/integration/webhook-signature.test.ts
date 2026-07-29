import { describe, it, expect, beforeAll } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";

// Pure signature-verification tests — no live network calls (constructEvent
// is local HMAC verification), so the 400/signature assertions run without a
// real Supabase project. The "no row written anywhere" assertion needs a
// real DB to check against, so it's gated on hasLiveTestCredentials.

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy_for_signature_tests";
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= "pk_test_dummy_for_signature_tests";
  process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_dummy_test_secret";
});

describe("Stripe webhook — signature verification", () => {
  it("rejects a request with no stripe-signature header (400, no DB access attempted)", async () => {
    const { POST } = await import("@/app/api/payments/stripe/webhook/route");
    const req = new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "payment_intent.succeeded" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects a forged payload — a plausible payment_intent.succeeded body signed with the wrong secret — with 400 and no database write anywhere", async () => {
    const { POST } = await import("@/app/api/payments/stripe/webhook/route");
    const { getStripe } = await import("@/lib/stripe/server");

    const fakePaymentIntentId = `pi_forged_${Date.now()}`;
    const payload = JSON.stringify({
      id: `evt_forged_${Date.now()}`,
      type: "payment_intent.succeeded",
      livemode: false,
      data: { object: { id: fakePaymentIntentId, status: "succeeded", amount: 5000, amount_received: 5000, currency: "eur" } },
    });
    const forgedSignature = getStripe().webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_this_is_not_the_real_secret",
    });

    const req = new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": forgedSignature },
      body: payload,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid signature/i);

    if (hasLiveTestCredentials) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createAdminClient() as any;
      const { data: events } = await db.from("stripe_webhook_events").select("event_id").ilike("event_id", "evt_forged_%");
      expect(events?.length ?? 0).toBe(0);
      const { data: transactions } = await db.from("transactions").select("id").eq("stripe_session_id", fakePaymentIntentId);
      expect(transactions?.length ?? 0).toBe(0);
    }
  });

  it("accepts a correctly-signed payload for an event type we don't act on (acknowledges without touching the DB)", async () => {
    const { POST } = await import("@/app/api/payments/stripe/webhook/route");
    const { getStripe } = await import("@/lib/stripe/server");
    const { getStripeWebhookSecret } = await import("@/lib/stripe/env");

    const payload = JSON.stringify({ id: "evt_fake", type: "payment_intent.created", livemode: false, data: { object: { id: "pi_fake" } } });
    const signature = getStripe().webhooks.generateTestHeaderString({
      payload,
      secret: getStripeWebhookSecret(),
    });

    const req = new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("rejects a correctly-signed but wrong-livemode event (e.g. a test event delivered to a production-configured deployment)", async () => {
    const { POST } = await import("@/app/api/payments/stripe/webhook/route");
    const { getStripe } = await import("@/lib/stripe/server");
    const { getStripeWebhookSecret } = await import("@/lib/stripe/env");

    // NODE_ENV is "test" under vitest, so expectedLivemode is false — a
    // livemode:true event should be rejected here.
    const payload = JSON.stringify({
      id: "evt_wrong_mode", type: "payment_intent.succeeded", livemode: true,
      data: { object: { id: "pi_fake_livemode" } },
    });
    const signature = getStripe().webhooks.generateTestHeaderString({ payload, secret: getStripeWebhookSecret() });

    const req = new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/mode does not match/i);
  });
});
