import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";
import { calculateShipping } from "@/lib/checkout/shipping";

// Full happy path against real Stripe TEST mode + a real test Supabase
// project: create-intent -> confirm with Stripe's test payment method token
// (no Elements/browser needed for API-level confirmation) -> deliver the
// signed webhook -> assert a real order was created and stock decremented.
// See tests/e2e/checkout-stripe.spec.ts for the browser-level equivalent
// through the actual PaymentElement iframe.
describe.skipIf(!hasLiveTestCredentials)("Stripe checkout — successful test-card payment creates a real, verified order", () => {
  const testProductId = `test-fixture-success-${Date.now()}`;
  let createdPaymentIntentId: string | undefined;
  let createdOrderId: string | undefined;

  beforeAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("products").insert({
      id: testProductId, name: "Success Path Test Fixture",
      price: 12, category: "test", stock_quantity: 5,
    });
  });

  afterAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    if (createdOrderId) {
      await db.from("order_items").delete().eq("order_id", createdOrderId);
      await db.from("transactions").delete().eq("order_id", createdOrderId);
      await db.from("orders").delete().eq("id", createdOrderId);
    }
    if (createdPaymentIntentId) {
      await db.from("pending_stripe_orders").delete().eq("payment_intent_id", createdPaymentIntentId);
    }
    await db.from("products").delete().eq("id", testProductId);
  });

  it("creates the order and decrements stock only after a genuine confirmed charge", async () => {
    const { POST: createIntent } = await import("@/app/api/payments/stripe/create-intent/route");
    const { POST: webhook } = await import("@/app/api/payments/stripe/webhook/route");
    const { getStripe } = await import("@/lib/stripe/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { getStripeWebhookSecret } = await import("@/lib/stripe/env");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    // The test fixture has no shipping_weight_grams set, so this falls back
    // to DEFAULT_ITEM_WEIGHT_GRAMS — computed here (not hardcoded) so the
    // assertions below stay correct once real An Post rates replace the
    // current 0 placeholders in lib/checkout/shipping.ts.
    const shippingEUR = calculateShipping(
      [{ quantity: 2, shippingWeightGrams: null }],
      undefined,
    ).priceEUR;

    const intentRes = await createIntent(new Request("http://localhost/api/payments/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: testProductId, product_name: "Success Path Test Fixture", product_image: null, quantity: 2, unit_price: 12 }],
        delivery_address: { name: "Test Buyer", email: "test@example.com" },
        currency: "EUR",
        client_shipping_eur: shippingEUR,
      }),
    }));
    expect(intentRes.status).toBe(200);
    const { client_secret } = await intentRes.json();
    const paymentIntentId: string = client_secret.split("_secret_")[0];
    createdPaymentIntentId = paymentIntentId;

    // Confirm server-side with Stripe's documented test PaymentMethod token
    // (equivalent to a customer entering 4242 4242 4242 4242 in Elements).
    const confirmed = await getStripe().paymentIntents.confirm(paymentIntentId, {
      payment_method: "pm_card_visa",
    });
    expect(confirmed.status).toBe("succeeded");

    const event = {
      id: `evt_test_${createdPaymentIntentId}`,
      type: "payment_intent.succeeded",
      data: { object: confirmed },
    };
    const payload = JSON.stringify(event);
    const signature = getStripe().webhooks.generateTestHeaderString({ payload, secret: getStripeWebhookSecret() });

    const webhookRes = await webhook(new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: payload,
    }));
    expect(webhookRes.status).toBe(200);
    const { order_id } = await webhookRes.json();
    expect(order_id).toBeTruthy();
    createdOrderId = order_id;

    const { data: order } = await db.from("orders").select("status, total_amount").eq("id", order_id).single();
    expect(order.status).toBe("processing");
    expect(order.total_amount).toBe(24 + shippingEUR); // 12 * 2 + shipping, server-verified

    const { data: product } = await db.from("products").select("stock_quantity").eq("id", testProductId).single();
    expect(product.stock_quantity).toBe(3); // 5 - 2

    // Regression guard for the confirmation-screen "Total Paid" bug: the
    // status endpoint the checkout page polls must return the real,
    // DB-verified total — not just an order_id for the client to
    // (mis)compute a display figure from separately. This is the exact
    // response ConfirmationScreen now renders from.
    const { GET: status } = await import("@/app/api/payments/stripe/status/route");
    const statusRes = await status(new Request(`http://localhost/api/payments/stripe/status?payment_intent_id=${paymentIntentId}`));
    expect(statusRes.status).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.status).toBe("completed");
    expect(statusBody.order_id).toBe(order_id);
    expect(statusBody.total_amount_eur).toBe(24 + shippingEUR);
    expect(statusBody.charged_amount).toBe(24 + shippingEUR); // EUR charge, so charged_amount === total_amount_eur
    expect(statusBody.currency).toBe("EUR");
    expect(statusBody.payment_channel).toBe("stripe_card");
  });
});
