import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { canRunCheckoutIntegration, adminDb, intentRequest, irishShippingFor } from "./helpers/checkoutIntent";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: process.env.TEST_CHECKOUT_USER_ID } } }) },
  }),
}));

// Replaces the old create-intent tampered-price and shipping-mismatch tests.
// Against real Stripe TEST mode: the intent's amount is the DB price +
// shipping whatever the client claims, and a page showing a different total
// gets a refusal with the right figure — not a different charge.
describe.skipIf(!canRunCheckoutIntegration)("POST /api/checkout/intent — price guards (real Stripe test mode)", () => {
  const testProductId = `test-fixture-intent-guards-${Date.now()}`;
  const realPrice = 40;
  const createdIntentIds: string[] = [];

  beforeAll(async () => {
    const db = await adminDb();
    await db.from("products").insert({ id: testProductId, name: "Intent Guards Test Fixture", price: realPrice, category: "test", stock_quantity: 5 });
  });

  afterAll(async () => {
    const db = await adminDb();
    const { getStripe } = await import("@/lib/stripe/server");
    for (const id of createdIntentIds) {
      await db.from("pending_stripe_orders").delete().eq("payment_intent_id", id);
      await getStripe().paymentIntents.cancel(id).catch(() => {});
    }
    await db.from("products").delete().eq("id", testProductId);
  });

  it("charges the DB price + shipping, ignoring a tampered 1-cent unit price", async () => {
    const { POST } = await import("@/app/api/checkout/intent/route");
    const { getStripe } = await import("@/lib/stripe/server");
    const expectedCents = Math.round((realPrice + irishShippingFor(1)) * 100);

    const res = await POST(intentRequest({
      items: [{ product_id: testProductId, product_name: "renamed by attacker", quantity: 1, unit_price: 0.01 }],
      expected_total_cents: expectedCents,
    }));
    expect(res.status).toBe(200);
    const { payment_intent_id } = await res.json();
    createdIntentIds.push(payment_intent_id);

    const intent = await getStripe().paymentIntents.retrieve(payment_intent_id);
    expect(intent.amount).toBe(expectedCents);
    expect(intent.currency).toBe("eur");

    const db = await adminDb();
    const { data: pending } = await db.from("pending_stripe_orders").select("total_amount, shipping_amount").eq("payment_intent_id", payment_intent_id).single();
    expect(Math.round(Number(pending?.total_amount) * 100)).toBe(intent.amount);
  }, 60_000);

  it("refuses when the page's total is missing shipping, and creates no intent", async () => {
    const { POST } = await import("@/app/api/checkout/intent/route");
    const res = await POST(intentRequest({
      items: [{ product_id: testProductId, product_name: "Intent Guards Test Fixture", quantity: 1 }],
      expected_total_cents: realPrice * 100, // items only, as on 4 Oct
    }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("price_changed");
    expect(body.quote.total_cents).toBe(Math.round((realPrice + irishShippingFor(1)) * 100));
    expect(body.client_secret).toBeUndefined();
  }, 60_000);
});
