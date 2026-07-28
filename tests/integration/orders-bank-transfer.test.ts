import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasLiveTestCredentials } from "../setup/testEnv";
import { calculateShipping } from "@/lib/checkout/shipping";

// The bank-transfer path (/api/orders) has no card network to verify a
// charge against — a human checks the bank statement separately — so the
// only thing standing between a tampered request and a wrong order record
// is server-side recomputation. This mirrors checkout-stripe-tampered-price
// .test.ts for the Stripe path.
describe.skipIf(!hasLiveTestCredentials)("/api/orders — server-verified totals, not client-submitted ones", () => {
  const testProductId = `test-fixture-orders-${Date.now()}`;
  const realPrice = 30;
  let createdOrderId: string | undefined;

  beforeAll(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    await db.from("products").insert({
      id: testProductId, name: "Bank Transfer Test Fixture",
      price: realPrice, category: "test", stock_quantity: 5,
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
    await db.from("products").delete().eq("id", testProductId);
  });

  it("ignores a tampered client-submitted total_amount/charged_amount and stores the server-recomputed figure instead", async () => {
    const { POST } = await import("@/app/api/orders/route");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;

    const shippingEUR = calculateShipping(
      [{ quantity: 1, shippingWeightGrams: null }],
      "IE",
    ).priceEUR;

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          product_id: testProductId, product_name: "Bank Transfer Test Fixture (renamed by attacker)",
          product_image: null, quantity: 1, unit_price: 0.01, // tampered — real price is 30
        }],
        // Also tampered — should be silently ignored, not stored.
        total_amount: 0.01,
        charged_amount: 0.01,
        delivery_address: { name: "Test Buyer", email: "test@example.com", country: "IE" },
        payment_method: "bank_transfer",
        order_ref: `TEST-${Date.now()}`,
        currency: "NGN",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order_id).toBeTruthy();
    createdOrderId = body.order_id;

    const { data: order } = await db.from("orders").select("total_amount").eq("id", body.order_id).single();
    expect(order.total_amount).toBe(realPrice + shippingEUR);

    const { data: items } = await db.from("order_items").select("unit_price, product_name").eq("order_id", body.order_id);
    expect(items[0].unit_price).toBe(realPrice);
    expect(items[0].product_name).toBe("Bank Transfer Test Fixture (renamed by attacker)");
  });

  it("rejects an order referencing a product that no longer exists", async () => {
    const { POST } = await import("@/app/api/orders/route");

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: "does-not-exist", product_name: "Ghost", product_image: null, quantity: 1, unit_price: 10 }],
        delivery_address: { name: "Test", email: "test@example.com", country: "IE" },
        payment_method: "bank_transfer",
        order_ref: `TEST-${Date.now()}`,
        currency: "NGN",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
