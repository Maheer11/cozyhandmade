import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { canRunCheckoutIntegration, adminDb, intentRequest, irishShippingFor } from "./helpers/checkoutIntent";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: process.env.TEST_CHECKOUT_USER_ID } } }) },
  }),
}));

// Declined card, then retry in the same checkout attempt: no order and no
// stock change from the decline, and the retry pays the SAME PaymentIntent
// rather than a second one.
describe.skipIf(!canRunCheckoutIntegration)("Stripe checkout — declined card, then retry", () => {
  const testProductId = `test-fixture-decline-${Date.now()}`;
  let createdPaymentIntentId: string | undefined;

  beforeAll(async () => {
    const db = await adminDb();
    await db.from("products").insert({
      id: testProductId, name: "Decline Path Test Fixture",
      price: 15, category: "test", stock_quantity: 5,
    });
  });

  afterAll(async () => {
    const db = await adminDb();
    if (createdPaymentIntentId) {
      await db.from("pending_stripe_orders").delete().eq("payment_intent_id", createdPaymentIntentId);
    }
    await db.from("products").delete().eq("id", testProductId);
  });

  it("a decline creates nothing; the retry reuses the same intent and charges the staged total", async () => {
    const { POST: createIntent } = await import("@/app/api/checkout/intent/route");
    const { getStripe } = await import("@/lib/stripe/server");
    const db = await adminDb();

    const attemptId = crypto.randomUUID();
    const request = () => intentRequest({
      attempt_id: attemptId,
      items: [{ product_id: testProductId, product_name: "Decline Path Test Fixture", quantity: 1 }],
      expected_total_cents: Math.round((15 + irishShippingFor(1)) * 100),
    });

    const first = await (await createIntent(request())).json();
    createdPaymentIntentId = first.payment_intent_id;

    // Stripe's documented "always declines" test payment method.
    await expect(
      getStripe().paymentIntents.confirm(first.payment_intent_id, { payment_method: "pm_card_visa_chargeDeclined" })
    ).rejects.toThrow(/declined/i);

    const { data: transactions } = await db.from("transactions").select("id").eq("stripe_session_id", first.payment_intent_id);
    expect(transactions?.length ?? 0).toBe(0);
    const { data: product } = await db.from("products").select("stock_quantity").eq("id", testProductId).single();
    expect(product?.stock_quantity).toBe(5); // untouched

    // Pay pressed again in the same attempt.
    const retry = await (await createIntent(request())).json();
    expect(retry.payment_intent_id).toBe(first.payment_intent_id);
    expect(retry.client_secret).toBe(first.client_secret);

    const paid = await getStripe().paymentIntents.confirm(retry.payment_intent_id, { payment_method: "pm_card_visa" });
    expect(paid.status).toBe("succeeded");
    const { data: pending } = await db.from("pending_stripe_orders").select("total_amount").eq("payment_intent_id", paid.id).single();
    expect(paid.amount_received).toBe(Math.round(Number(pending?.total_amount) * 100));
  }, 60_000);
});
