import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";
import { calculateShipping } from "@/lib/checkout/shipping";

// Requires real Stripe TEST-mode + a real test Supabase project — see
// .env.test.example. Skips without them.
describe.skipIf(!hasLiveTestCredentials)("Stripe create-intent — tampered client price is ignored", () => {
  const testProductId = `test-fixture-tamper-${Date.now()}`;
  const realPrice = 40;
  let createdPaymentIntentId: string | undefined;

  beforeAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("products").insert({
      id: testProductId, name: "Tamper Test Fixture",
      price: realPrice, category: "test", stock_quantity: 10,
    });
  });

  afterAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { getStripe } = await import("@/lib/stripe/server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("products").delete().eq("id", testProductId);
    if (createdPaymentIntentId) {
      await db.from("pending_stripe_orders").delete().eq("payment_intent_id", createdPaymentIntentId);
      await getStripe().paymentIntents.cancel(createdPaymentIntentId).catch(() => {});
    }
  });

  it("charges the real DB price, not a client-submitted 1-cent price", async () => {
    const { POST } = await import("@/app/api/payments/stripe/create-intent/route");
    const { getStripe } = await import("@/lib/stripe/server");

    // No shipping_weight_grams set on the fixture — falls back to
    // DEFAULT_ITEM_WEIGHT_GRAMS. Computed here (not hardcoded) so this stays
    // correct once real An Post rates replace today's 0 placeholders.
    const shippingEUR = calculateShipping(
      [{ quantity: 1, shippingWeightGrams: null }],
      undefined,
    ).priceEUR;

    const req = new Request("http://localhost/api/payments/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          product_id: testProductId, product_name: "Tamper Test Fixture (renamed by attacker)",
          product_image: null, quantity: 1,
          unit_price: 0.01, // tampered — real price is 40
        }],
        delivery_address: { name: "Test", email: "test@example.com" },
        currency: "EUR",
        client_shipping_eur: shippingEUR,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const { client_secret } = await res.json();
    expect(client_secret).toBeTruthy();

    const paymentIntentId: string = client_secret.split("_secret_")[0];
    createdPaymentIntentId = paymentIntentId;
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

    // Real price (40 EUR) + shipping, in minor units — not the tampered 1 cent.
    expect(paymentIntent.amount).toBe(Math.round((realPrice + shippingEUR) * 100));
  });
});
