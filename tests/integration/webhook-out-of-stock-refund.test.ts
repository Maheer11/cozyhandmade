import { describe, it, expect, afterEach } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";

// Covers the two fixes to app/api/payments/stripe/webhook/route.ts:
// out-of-stock now refunds instead of leaving a TODO, and the
// stripe_webhook_events dedupe row distinguishes "processing" (mid-flight)
// from "done" (terminal) instead of one row meaning both. Each test seeds
// its own product/PaymentIntent so they don't interfere with each other.
describe.skipIf(!hasLiveTestCredentials)("Stripe webhook — out-of-stock refund and dedupe status", () => {
  const cleanupProductIds: string[] = [];
  const cleanupPaymentIntentIds: string[] = [];
  const cleanupEventIds: string[] = [];

  afterEach(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    for (const id of cleanupEventIds.splice(0)) {
      await db.from("stripe_webhook_events").delete().eq("event_id", id);
    }
    for (const id of cleanupPaymentIntentIds.splice(0)) {
      await db.from("refunds").delete().eq("payment_intent_id", id);
      await db.from("pending_stripe_orders").delete().eq("payment_intent_id", id);
    }
    for (const id of cleanupProductIds.splice(0)) {
      await db.from("products").delete().eq("id", id);
    }
  });

  // Stages a real, confirmed PaymentIntent against a product with zero
  // stock, so checkout_verified_order() deterministically raises
  // OUT_OF_STOCK — no need to race two real requests to trigger it.
  async function stageOutOfStockCharge(label: string) {
    const { getStripe } = await import("@/lib/stripe/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const productId = `test-fixture-oos-${label}-${Date.now()}`;
    cleanupProductIds.push(productId);
    await db.from("products").insert({
      id: productId, name: `Out of Stock Test Fixture (${label})`,
      price: 20, category: "test", stock_quantity: 0,
    });

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: 2000, currency: "eur", payment_method_types: ["card"], confirm: false,
    });
    cleanupPaymentIntentIds.push(paymentIntent.id);
    const confirmed = await getStripe().paymentIntents.confirm(paymentIntent.id, { payment_method: "pm_card_visa" });

    await db.from("pending_stripe_orders").insert({
      payment_intent_id: paymentIntent.id,
      user_id: null,
      items: [{ item_type: "product", ref_id: productId, product_name: "Out of Stock Test Fixture", product_image: null, quantity: 1, unit_price: 20 }],
      delivery_address: { name: "Test", email: "test@example.com" },
      total_amount: 20,
      currency: "EUR",
    });

    return { productId, paymentIntent: confirmed };
  }

  async function signedPayloadFor(paymentIntent: { id: string }, eventId: string) {
    const { getStripe } = await import("@/lib/stripe/server");
    const { getStripeWebhookSecret } = await import("@/lib/stripe/env");
    const payload = JSON.stringify({ id: eventId, type: "payment_intent.succeeded", data: { object: paymentIntent } });
    const signature = getStripe().webhooks.generateTestHeaderString({ payload, secret: getStripeWebhookSecret() });
    return { payload, signature };
  }

  it("out-of-stock triggers exactly one refund and returns 200, not 409", async () => {
    const { getStripe } = await import("@/lib/stripe/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { POST: webhook } = await import("@/app/api/payments/stripe/webhook/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { paymentIntent } = await stageOutOfStockCharge("single");
    const eventId = `evt_test_oos_${paymentIntent.id}`;
    cleanupEventIds.push(eventId);
    const { payload, signature } = await signedPayloadFor(paymentIntent, eventId);

    const res = await webhook(new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST", headers: { "stripe-signature": signature }, body: payload,
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.refunded).toBe(true);

    const { data: refunds } = await db.from("refunds").select("*").eq("payment_intent_id", paymentIntent.id);
    expect(refunds?.length).toBe(1);
    expect(refunds[0].status).toBe("succeeded");
    expect(refunds[0].stripe_refund_id).toBeTruthy();

    const stripeRefunds = await getStripe().refunds.list({ payment_intent: paymentIntent.id });
    expect(stripeRefunds.data.length).toBe(1);

    // Staging row kept (not deleted) — it's the only record of the cart —
    // but marked resolved.
    const { data: pending } = await db.from("pending_stripe_orders").select("resolved_at").eq("payment_intent_id", paymentIntent.id).single();
    expect(pending.resolved_at).toBeTruthy();

    const { data: eventRow } = await db.from("stripe_webhook_events").select("status").eq("event_id", eventId).single();
    expect(eventRow.status).toBe("done");
  });

  it("a duplicate delivery of the same out-of-stock event does not refund twice", async () => {
    const { getStripe } = await import("@/lib/stripe/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { POST: webhook } = await import("@/app/api/payments/stripe/webhook/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { paymentIntent } = await stageOutOfStockCharge("dup");
    const eventId = `evt_test_oos_dup_${paymentIntent.id}`;
    cleanupEventIds.push(eventId);
    const { payload, signature } = await signedPayloadFor(paymentIntent, eventId);

    const makeRequest = () => new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST", headers: { "stripe-signature": signature }, body: payload,
    });

    const first = await webhook(makeRequest());
    const second = await webhook(makeRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.note).toMatch(/already processed/i);

    const { data: refunds } = await db.from("refunds").select("id").eq("payment_intent_id", paymentIntent.id);
    expect(refunds?.length).toBe(1);

    const stripeRefunds = await getStripe().refunds.list({ payment_intent: paymentIntent.id });
    expect(stripeRefunds.data.length).toBe(1);
  });

  it("a duplicate delivery while the first is still processing returns 409 and does not mark done", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { getStripe } = await import("@/lib/stripe/server");
    const { getStripeWebhookSecret } = await import("@/lib/stripe/env");
    const { POST: webhook } = await import("@/app/api/payments/stripe/webhook/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // Simulate a delivery genuinely mid-flight: seed the dedupe row directly
    // as "processing" with a fresh updated_at, without ever finishing it —
    // no real charge/order needed to exercise this branch, since the
    // dedupe check happens before any pending_stripe_orders lookup.
    const eventId = `evt_test_midflight_${Date.now()}`;
    cleanupEventIds.push(eventId);
    await db.from("stripe_webhook_events").insert({ event_id: eventId, status: "processing" });

    const payload = JSON.stringify({
      id: eventId, type: "payment_intent.succeeded",
      data: { object: { id: `pi_fake_${Date.now()}`, status: "succeeded", amount: 100, amount_received: 100, currency: "eur" } },
    });
    const signature = getStripe().webhooks.generateTestHeaderString({ payload, secret: getStripeWebhookSecret() });

    const res = await webhook(new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST", headers: { "stripe-signature": signature }, body: payload,
    }));

    expect(res.status).toBe(409);

    const { data: eventRow } = await db.from("stripe_webhook_events").select("status").eq("event_id", eventId).single();
    expect(eventRow.status).toBe("processing"); // untouched — not deleted, not marked done
  });

  it("refund-call failure returns 500, allows retry, and records a durable failed attempt", async () => {
    const { getStripe } = await import("@/lib/stripe/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { POST: webhook } = await import("@/app/api/payments/stripe/webhook/route");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { paymentIntent } = await stageOutOfStockCharge("fail");
    const eventId = `evt_test_oos_fail_${paymentIntent.id}`;
    cleanupEventIds.push(eventId);
    const { payload, signature } = await signedPayloadFor(paymentIntent, eventId);

    // Force the refund call itself to fail, without needing a second live
    // Stripe account/misconfiguration to provoke a real one — monkey-patch
    // the singleton's method for the duration of this one request, then
    // restore it so later tests are unaffected.
    const stripe = getStripe();
    const originalCreate = stripe.refunds.create;
    stripe.refunds.create = (() => Promise.reject(new Error("simulated refund failure"))) as typeof stripe.refunds.create;

    try {
      const res = await webhook(new Request("http://localhost/api/payments/stripe/webhook", {
        method: "POST", headers: { "stripe-signature": signature }, body: payload,
      }));
      expect(res.status).toBe(500);
    } finally {
      stripe.refunds.create = originalCreate;
    }

    const { data: refunds } = await db.from("refunds").select("*").eq("payment_intent_id", paymentIntent.id);
    expect(refunds?.length).toBe(1);
    expect(refunds[0].status).toBe("failed");
    expect(refunds[0].error_message).toMatch(/simulated refund failure/);

    // Dedupe row deleted so Stripe's real retry can attempt again — this is
    // the one case where retry is correct.
    const { data: eventRow } = await db.from("stripe_webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
    expect(eventRow).toBeNull();
  });
});
