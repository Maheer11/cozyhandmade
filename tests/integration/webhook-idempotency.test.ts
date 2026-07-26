import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";

// Requires a real Stripe TEST-mode account + a real (test-only!) Supabase
// project with lib/supabase/schema.sql (incl. migration 004) applied — see
// .env.test.example. Skips (not fails) without them, since those
// credentials are the test operator's to provide.
describe.skipIf(!hasLiveTestCredentials)("Stripe webhook — duplicate delivery idempotency", () => {
  const testProductId = `test-fixture-${Date.now()}`;
  let paymentIntentId: string;
  let signedPayload: { payload: string; signature: string };

  beforeAll(async () => {
    const { stripe } = await import("@/lib/stripe/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { getStripeWebhookSecret } = await import("@/lib/stripe/env");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // Self-contained fixture — this test seeds and never depends on
    // pre-existing catalogue data in the test project.
    await db.from("products").insert({
      id: testProductId, name: "Webhook Idempotency Test Fixture",
      price: 5, category: "test", stock_quantity: 10,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 500,
      currency: "eur",
      payment_method_types: ["card"],
      confirm: false,
    });
    paymentIntentId = paymentIntent.id;

    await db.from("pending_stripe_orders").insert({
      payment_intent_id: paymentIntentId,
      user_id: null,
      items: [{ item_type: "product", ref_id: testProductId, product_name: "Test Item", product_image: null, quantity: 1, unit_price: 5 }],
      delivery_address: { name: "Test", email: "test@example.com" },
      total_amount: 5,
      currency: "EUR",
    });

    const event = {
      id: `evt_test_${paymentIntentId}`,
      type: "payment_intent.succeeded",
      data: { object: { ...paymentIntent, status: "succeeded", amount_received: paymentIntent.amount } },
    };
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: getStripeWebhookSecret() });
    signedPayload = { payload, signature };
  });

  it("creates exactly one order across two identical webhook deliveries", async () => {
    const { POST } = await import("@/app/api/payments/stripe/webhook/route");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const makeRequest = () => new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signedPayload.signature },
      body: signedPayload.payload,
    });

    const first = await POST(makeRequest());
    const second = await POST(makeRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const { data: transactions } = await db
      .from("transactions")
      .select("id")
      .eq("stripe_session_id", paymentIntentId);

    expect(transactions?.length).toBe(1);
  });

  afterAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const { data: transactions } = await db.from("transactions").select("order_id").eq("stripe_session_id", paymentIntentId);
    const orderId = transactions?.[0]?.order_id;
    if (orderId) {
      await db.from("order_items").delete().eq("order_id", orderId);
      await db.from("transactions").delete().eq("order_id", orderId);
      await db.from("orders").delete().eq("id", orderId);
    }
    await db.from("pending_stripe_orders").delete().eq("payment_intent_id", paymentIntentId);
    await db.from("products").delete().eq("id", testProductId);
  });
});
