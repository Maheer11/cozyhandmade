import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";

// End-to-end cover for the emails the webhook sends. Requires the same live
// Stripe TEST-mode + test Supabase project as the other integration tests,
// plus migration 008 (email_deliveries) applied.
//
// RESEND_API_KEY is deliberately NOT required. With no key configured every
// send short-circuits to { sent: false, error: "Email service not
// configured" } without touching the network, which is exactly the shape of
// a provider outage — so these assert the ledger and the webhook's status
// code, not that mail physically arrived. The protocol itself is covered
// without any credentials in tests/unit/email-deliveries.test.ts.
describe.skipIf(!hasLiveTestCredentials)("Stripe webhook — order and refund emails", () => {
  const cleanupProductIds: string[] = [];
  const cleanupPaymentIntentIds: string[] = [];
  const cleanupEventIds: string[] = [];
  const cleanupOrderIds: string[] = [];

  async function admin() {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createAdminClient() as any;
  }

  // Stages a guest order (user_id: null) against a product with the given
  // stock, and returns a signed webhook delivery for it.
  async function stageGuestOrder(stock: number) {
    const { getStripe } = await import("@/lib/stripe/server");
    const { getStripeWebhookSecret } = await import("@/lib/stripe/env");
    const db = await admin();

    const productId = `test-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cleanupProductIds.push(productId);
    await db.from("products").insert({
      id: productId, name: "Order Email Test Fixture",
      price: 5, category: "test", stock_quantity: stock,
    });

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: 500, currency: "eur", payment_method_types: ["card"], confirm: false,
    });
    cleanupPaymentIntentIds.push(paymentIntent.id);

    await db.from("pending_stripe_orders").insert({
      payment_intent_id: paymentIntent.id,
      user_id: null, // guest checkout — no account, email only on the address
      items: [{
        item_type: "product", ref_id: productId, product_name: "Test Item",
        product_image: null, quantity: 1, unit_price: 5, shipping_weight_grams: 500,
      }],
      delivery_address: {
        firstName: "Maja", lastName: "Byrne", email: "guest@example.com",
        address: "12 Example Street", city: "Dublin", postcode: "D03 XY12", country: "IE",
      },
      total_amount: 5,
      subtotal_amount: 5,
      shipping_amount: 0,
      currency: "EUR",
    });

    const eventId = `evt_test_email_${paymentIntent.id}`;
    cleanupEventIds.push(eventId);
    const payload = JSON.stringify({
      id: eventId,
      type: "payment_intent.succeeded",
      data: { object: { ...paymentIntent, status: "succeeded", amount_received: paymentIntent.amount } },
    });
    const signature = getStripe().webhooks.generateTestHeaderString({
      payload, secret: getStripeWebhookSecret(),
    });

    const request = () => new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    });

    return { paymentIntentId: paymentIntent.id, request };
  }

  it("claims exactly one order_confirmation for a guest order, and none twice", async () => {
    const { POST } = await import("@/app/api/payments/stripe/webhook/route");
    const db = await admin();
    const { paymentIntentId, request } = await stageGuestOrder(10);

    const first = await POST(request());
    expect(first.status).toBe(200);

    const { data: afterFirst } = await db
      .from("email_deliveries")
      .select("kind, recipient, status")
      .eq("payment_intent_id", paymentIntentId)
      .eq("kind", "order_confirmation");

    // Guest checkout: the address is the only source of an email address,
    // and it must be enough.
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0].recipient).toBe("guest@example.com");

    // A duplicate delivery of the same event must not produce a second
    // confirmation. The unique (kind, payment_intent_id) constraint is what
    // enforces it.
    const second = await POST(request());
    expect(second.status).toBe(200);

    const { data: afterSecond } = await db
      .from("email_deliveries")
      .select("id")
      .eq("payment_intent_id", paymentIntentId)
      .eq("kind", "order_confirmation");
    expect(afterSecond).toHaveLength(1);

    const { data: tx } = await db.from("transactions").select("order_id").eq("stripe_session_id", paymentIntentId);
    if (tx?.[0]?.order_id) cleanupOrderIds.push(tx[0].order_id);
  });

  it("returns 200 even though the email provider is unavailable", async () => {
    const { POST } = await import("@/app/api/payments/stripe/webhook/route");
    const db = await admin();
    const { paymentIntentId, request } = await stageGuestOrder(10);

    // No RESEND_API_KEY in the test environment, so the send fails the same
    // way a provider outage does. The webhook must still acknowledge, or
    // Stripe would retry a delivery whose order already exists.
    const res = await POST(request());
    expect(res.status).toBe(200);

    const { data: order } = await db.from("transactions").select("order_id").eq("stripe_session_id", paymentIntentId);
    expect(order?.[0]?.order_id).toBeTruthy();
    cleanupOrderIds.push(order[0].order_id);

    // The failure is recorded rather than lost.
    const { data: deliveries } = await db
      .from("email_deliveries")
      .select("status, error_message")
      .eq("payment_intent_id", paymentIntentId)
      .eq("kind", "order_confirmation");
    expect(deliveries[0].status).toBe("failed");
    expect(deliveries[0].error_message).toBeTruthy();
  });

  it("claims a refund_notification on the out-of-stock path", async () => {
    const { POST } = await import("@/app/api/payments/stripe/webhook/route");
    const db = await admin();
    const { paymentIntentId, request } = await stageGuestOrder(0); // zero stock

    const res = await POST(request());
    expect(res.status).toBe(200);
    expect((await res.json()).refunded).toBe(true);

    const { data: deliveries } = await db
      .from("email_deliveries")
      .select("kind, recipient")
      .eq("payment_intent_id", paymentIntentId);

    const kinds = deliveries.map((d: { kind: string }) => d.kind);
    expect(kinds).toContain("refund_notification");
    // No order exists on this path, so no confirmation should be claimed.
    expect(kinds).not.toContain("order_confirmation");
  });

  afterAll(async () => {
    const db = await admin();
    for (const id of cleanupPaymentIntentIds.splice(0)) {
      await db.from("email_deliveries").delete().eq("payment_intent_id", id);
      await db.from("refunds").delete().eq("payment_intent_id", id);
      await db.from("pending_stripe_orders").delete().eq("payment_intent_id", id);
      await db.from("transactions").delete().eq("stripe_session_id", id);
    }
    for (const id of cleanupOrderIds.splice(0)) {
      await db.from("order_items").delete().eq("order_id", id);
      await db.from("transactions").delete().eq("order_id", id);
      await db.from("orders").delete().eq("id", id);
    }
    for (const id of cleanupEventIds.splice(0)) {
      await db.from("stripe_webhook_events").delete().eq("event_id", id);
    }
    for (const id of cleanupProductIds.splice(0)) {
      await db.from("products").delete().eq("id", id);
    }
  });
});
