import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";
import { calculateShipping } from "@/lib/checkout/shipping";

describe.skipIf(!hasLiveTestCredentials)("Stripe checkout — a declined test card never creates an order", () => {
  const testProductId = `test-fixture-decline-${Date.now()}`;
  let createdPaymentIntentId: string | undefined;

  beforeAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("products").insert({
      id: testProductId, name: "Decline Path Test Fixture",
      price: 15, category: "test", stock_quantity: 5,
    });
  });

  afterAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    if (createdPaymentIntentId) {
      await db.from("pending_stripe_orders").delete().eq("payment_intent_id", createdPaymentIntentId);
    }
    await db.from("products").delete().eq("id", testProductId);
  });

  it("leaves stock untouched and creates no order/transaction when the card is declined", async () => {
    const { POST: createIntent } = await import("@/app/api/payments/stripe/create-intent/route");
    const { getStripe } = await import("@/lib/stripe/server");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const shippingEUR = calculateShipping(
      [{ quantity: 1, shippingWeightGrams: null }],
      undefined,
    ).priceEUR;

    const intentRes = await createIntent(new Request("http://localhost/api/payments/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: testProductId, product_name: "Decline Path Test Fixture", product_image: null, quantity: 1, unit_price: 15 }],
        delivery_address: { name: "Test Buyer", email: "test@example.com" },
        currency: "EUR",
        client_shipping_eur: shippingEUR,
      }),
    }));
    const { client_secret } = await intentRes.json();
    const paymentIntentId: string = client_secret.split("_secret_")[0];
    createdPaymentIntentId = paymentIntentId;

    // Stripe's documented "always declines" test payment method.
    await expect(
      getStripe().paymentIntents.confirm(paymentIntentId, { payment_method: "pm_card_visa_chargeDeclined" })
    ).rejects.toThrow(/declined/i);

    const { data: transactions } = await db.from("transactions").select("id").eq("stripe_session_id", createdPaymentIntentId);
    expect(transactions?.length ?? 0).toBe(0);

    const { data: product } = await db.from("products").select("stock_quantity").eq("id", testProductId).single();
    expect(product.stock_quantity).toBe(5); // untouched
  });
});
